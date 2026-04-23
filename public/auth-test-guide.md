# Authenticated Style Guide

This is a protected document that requires authentication to view.
It contains our core component definitions that are meant only for internal employees.

## Primary Button

Here is the data block that the UI Validator extension will scrape.
If you are seeing this, you successfully bypassed the auth gate!

!!UI-VAL-DATA!!
{
  "name": "Auth Protected Button",
  "htmlTag": "button",
  "cssClass": "btn-protected",
  "cssId": "",
  "isEnabled": true,
  "styleRules": [
    {
      "id": "mock_rule_1",
      "property": "background-color",
      "value": "#1a73e8",
      "state": "default",
      "severity": "error"
    },
    {
      "id": "mock_rule_2",
      "property": "border-radius",
      "value": "8px",
      "state": "default",
      "severity": "warn"
    }
  ]
}

Thank you for authenticating!
