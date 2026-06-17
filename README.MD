
Backend: 

- Rename .example.env to .env
- Add following values in .env in server folder
  - db connection string in DATABASE_URL

- Run 'npm run db:up' and it will create execute all the migration scripts for the db

- Run 'npm run db:seed' which will add dummy products in the products table for testing

- Server is ready to test

Frontend:

- Rename .example.env to .env
- Add the api url (I have already added a deployed backend url if you want to use that)