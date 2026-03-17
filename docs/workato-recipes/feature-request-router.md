# Community Feature Request Router

## Purpose

This Workato recipe turns community feature requests into structured product signals. It accepts a POST payload from the Community Voices demo app, formats the request into a clean notification, forwards it to a demo or production destination, and returns a confirmation payload to the caller.

This is useful for showing how community intelligence can move directly into product operations without manual copy-paste.

## Recipe Overview

- Name: `Community Feature Request Router`
- Trigger: `API Platform - New API request (POST)`
- Input fields: `post_id`, `author`, `content`, `region`, `platform`

## Flow

```text
Community Voices UI
        |
        | POST feature request payload
        v
Workato API Platform trigger
        |
        | Action 1: format notification message
        v
HTTP connector POST
        |
        | demo: webhook.site
        | production: Slack webhook / Slack connector
        v
API Platform response
        |
        | { success: true, ticket_id: "demo-123", routed_to: "product-team" }
        v
Caller receives confirmation
```

## Sample Request JSON

```json
{
  "post_id": "p002",
  "author": "Lars Eriksson",
  "region": "europe",
  "platform": "discord",
  "content": "Would love a native Teams connector supporting adaptive cards."
}
```

## Sample Response JSON

```json
{
  "success": true,
  "ticket_id": "demo-123",
  "routed_to": "product-team"
}
```

## Step By Step Setup In Workato

1. In Workato, create a new recipe and name it `Community Feature Request Router`.
2. Select `API Platform` as the trigger app.
3. Choose `New API request` and configure it for `POST`.
4. Define the input schema with these fields:
   `post_id` as text, `author` as text, `content` as text, `region` as text, `platform` as text.
5. Save the trigger so Workato generates the API endpoint.
6. Add Action 1 using a formatting step such as `Message template`, `Variables by Workato`, or `Compose text`.
7. Build a notification body that includes the post ID, author, region, platform, and full request content.
8. Add Action 2 with the `HTTP` connector for the demo path.
9. Configure the HTTP action to `POST` the formatted payload to `https://webhook.site/...` for a visible demo sink.
10. For production, replace the demo target with a Slack webhook, Slack connector action, or an internal product intake endpoint.
11. Add Action 3 using `API Platform - Response to API request`.
12. Return this JSON payload:

```json
{
  "success": true,
  "ticket_id": "demo-123",
  "routed_to": "product-team"
}
```

13. Start the recipe and copy the generated API endpoint.
14. Store that endpoint in the frontend deployment as `WORKATO_ROUTE_TO_PRODUCT_WEBHOOK`.

## Suggested Notification Template

```text
New community feature request

Post ID: {{post_id}}
Author: {{author}}
Region: {{region}}
Platform: {{platform}}

Request:
{{content}}
```

## Notes

- `API Platform` requires a paid Workato plan.
- `webhook.site` is useful for demos because it shows raw requests without extra setup.
- In production, route the notification to Slack, Jira, Linear, or an internal product ops workflow.
