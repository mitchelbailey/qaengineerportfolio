/*
1. Successful product-list request

Verify:

HTTP status;
expected response shape;
important fields and types;
known seeded product exists.
2. Product lookup by slug

Verify:

the correct product is returned;
price and stock values are valid;
an unknown slug produces the agreed error response.
3. Cart or order validation

Submit a valid request, then try something invalid such as:

nonexistent product;
quantity of zero;
quantity above available stock;
malformed request body.

This demonstrates positive and negative testing.

4. API-created state used by an E2E test

Use the API to prepare data, then validate the result through the UI. 
This is especially valuable because it shows you understand API setup as a tool for making browser tests faster and more deterministic.*/