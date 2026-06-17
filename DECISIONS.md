## Decisions

<h3>DESC</h3>

I have tried to make a generic coupon system which can create and use many types of coupons for ex: nth order coupon, first order coupon or coupon to any specific person. The way I achieved that is by creating coupon configurations and then the coupon engine evaluates the condition based on the coupon configuration trigger type.

I have used Express with Typescript and PostgreSQL. Since I wanted to write raw queries I did not go with a full fledge ORM but I am using a lightweight tool for managing db schema migrations(node-pg-migrate) and executing npm run db:up will trigger it. 

For adding dummy products I found a site (https://dummyjson.com/docs/products) which gives me the data for dummy products so I wrote a script which will seed the products in the products table and executing npm run db:seed will trigger it.


I haven't used enums because they are harder to evolve instead I used check constraints in db-migrations script since they are more flixible to modify in future.

<h3>Auth</h3>

I am using username and password for authentication. I am also passing the role in the signup endpoint so that it is easy to create users since I did not work on any user management module.

I also haven't added any refresh token mechanism.


<h3>Products</h3>
I only have one endpoint for products which returns all the products; I do not have any pagination or server side search or endpoint for a specific product detail(product/:id).

I also do not have any product management endpoints.


<h3>Cart</h3>
For cart I maintain one cart per user and I also enforce this check in the db migration script for creat_cart_table.ts. Once the user places the order the status of that row changes from active to checked_out.

I have a table for shopping_cart_items which I am not using for order items for many reason some of them being - Orders are immutable contract, shopping cart items could be used for audit, etc.


<h3>Coupons</h3>
For coupons I have two tables - 
coupons - This stores the header details about the coupon
coupon_configuration - This stores the actual configuration of the coupon the discount amount, coupon type, how and why it should trigger, etc. It is referenced in the coupons table.


Then I have a coupon engine where i have a coupons/engine/evaluator folder which contains the logic for the coupon conditions that have to be checked when placing an order. I have made it scalable and modular and adding new coupon conditions will be much easier to add in future.


<h3>Orders</h3>
The place order logic is in a transaction wrapper for atomicity of all the queries. I also have 'FOR UPDATE' added into the queries which gives concurrency control by acquiring a row lock preventing two concurrent checkouts from purchasing the same last unit of stock. 

Together the transaction wrapper and row locking gives concurrency control since using the row locking without the transaction would release the lock after every query whereas in a transaction it acquires row lock for the entire transaction.