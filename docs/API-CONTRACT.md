# Проект API / 1С — предварительный контракт

> Этот документ — спецификация проектирования, **не существующее работающее API**.

## Интеграционный подход

- Начинать с обследования конфигурации 1С, доступных HTTP-сервисов/OData и системы заявок на планшетах.
- Учётные данные 1С хранить **только на сервере** в secrets manager; не передавать в браузер и не коммитить.
- Для 1С предусмотреть интеграционного пользователя с минимальными правами.
- Проверить конфигурацию и версию 1С. Возможность записи стандартным OData зависит от конкретной базы, расширений и разрешений.
- Не делать бизнес-логику склада, финансов и дебиторки в браузере.

## Направления обмена

| 1С → Backend | Backend → 1С |
|---|---|
| Юрлица и договоры | Заявки на согласованном этапе |
| Товары, прайс-листы, единицы | Подтверждённые операции отгрузки (если разрешено) |
| Склады, остатки, резервы | Сведения о возвратах / расхождениях |
| Реализации, оплаты, долги | Результаты доставок / ссылки на доказательства |

Избегать дублирования проводок: первичный ключ внешнего документа, `external_id`, `source_system`, версия и идемпотентность обязательны.

## Предлагаемые HTTP endpoints

```text
GET    /api/v1/session
GET    /api/v1/dashboard
GET    /api/v1/customers?search=&page=
POST   /api/v1/customers
GET    /api/v1/customers/{id}
PATCH  /api/v1/customers/{id}
GET    /api/v1/outlets?region=&rep=&page=
POST   /api/v1/outlets
GET    /api/v1/outlets/{id}
PATCH  /api/v1/outlets/{id}
POST   /api/v1/outlets/{id}/notes
GET    /api/v1/products
GET    /api/v1/warehouses/{id}/stocks
GET    /api/v1/orders?status=&date=
POST   /api/v1/orders
GET    /api/v1/orders/{id}
POST   /api/v1/orders/{id}/transitions
GET    /api/v1/receivables
GET    /api/v1/consignments
POST   /api/v1/consignments/{id}/reconciliations
GET    /api/v1/routes?date=&status=
POST   /api/v1/routes
GET    /api/v1/routes/{id}
POST   /api/v1/routes/{id}/transitions
POST   /api/v1/routes/{id}/stops/{stopId}/outcomes
POST   /api/v1/documents/upload-intents
POST   /api/v1/documents/complete
GET    /api/v1/entities/{type}/{id}/documents
GET    /api/v1/audit?entity=&cursor=
GET    /api/v1/integrations/1c/health
GET    /api/v1/integrations/1c/jobs
POST   /api/v1/integrations/1c/retry/{jobId} [restricted]
```

### Принципы API

- Серверная session-cookie с `HttpOnly`, `Secure`, `SameSite`, CSRF protection и антибрутфорсом; не хранить токены авторизации в localStorage.
- Все права проверять **на сервере**, с объектным scope по контрагенту/магазину/маршруту.
- Любое изменение статуса — отдельная доменная команда с `expected_version` и `Idempotency-Key`.
- Журнал должен фиксировать actor, time, entity, old/new values и request correlation id.
- Дебиторка из 1С — read-only для UI на первом боевом этапе. Никаких «нарисованных платежей».
- Файлы — приватное хранилище, ограниченные подписанные URL, антивирус, MIME whitelist, ограничения размера, аудит скачивания.
- Обязательное подтверждение реальных накладных, в том числе при частичной доставке.
- Пагинация, сортировка, фильтрация, поиск и экспорт с лимитами и безопасным маскированием данных.
- Доступность и повторная обработка: DLQ, backoff, retries, дедупликация, мониторинг расхождений.
- Внешние процессы под реализацию — отдельные документы передачи и сверки, не обычные продажи.

## Процесс запуска

1. Получить название конфигурации и версию 1С, перечень доступных объектов.
2. Получить название и описание планшетного приложения; проверить API/выгрузки.
3. Утвердить ownership полей, правила списания, кредитных лимитов и возвратов.
4. Согласовать таблицу соответствия GUID и внешних ID.
5. Поднять отдельную среду интеграции **только после прямого разрешения**.
6. Тестировать на обезличенных данных, затем пилот на ограниченных клиентах.
