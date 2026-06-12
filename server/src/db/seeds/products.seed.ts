import db from "../postgres.db.js";

interface Product {
    title: string;
    price: number;
    description: string;
    category: string;
    thumbnail: string;
}

type ProductValue = Product[keyof Product];

const seedProducts = async () => {
    try {
        const response = await fetch('https://dummyjson.com/products?limit=0&select=title,price,description,category,thumbnail');
        if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`)
        const data = await response.json();
        const products: Product[] = data.products;

        await db.query('TRUNCATE TABLE products RESTART IDENTITY');

        const placeholders: string[] = [];
        const values: ProductValue[] = [];

        products.forEach((product, idx) => {
            const offset = idx * 5;

            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
            );

            values.push(
                product.title,
                product.price,
                product.description,
                product.category,
                product.thumbnail,
            );
        });

        await db.query(
            `INSERT INTO products (name, price, description, category, image_uri)
        VALUES ${placeholders.join(',')}`,
            values
        )

        console.log(`Seeded ${products.length} products`);
    } catch (err) {
        console.error('Error seeding products:', err);
        process.exit(1);
    } finally {
        await db.end();
    }
}

seedProducts()


