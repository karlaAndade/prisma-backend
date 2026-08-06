require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./database');


async function seed(){


try{


// ADMIN

const admin = await db.query(
'SELECT COUNT(*) FROM admins'
);


if(Number(admin.rows[0].count) === 0){


const hash = bcrypt.hashSync(
process.env.ADMIN_PASSWORD || 'prisma2026',
10
);


await db.query(
`
INSERT INTO admins(username,password_hash)
VALUES($1,$2)
`,
[
process.env.ADMIN_USER || 'admin',
hash
]
);


console.log('✓ Usuario administrador creado');

}



// CATEGORIAS


const cats = await db.query(
'SELECT COUNT(*) FROM categories'
);



if(Number(cats.rows[0].count) === 0){


const categorias = [
'Accesorios',
'Bolsos',
'Joyería',
'Hogar & Decor',
'Papelería',
'Tecnología'
];


for(const c of categorias){

await db.query(
'INSERT INTO categories(name) VALUES($1)',
[c]
);

}


console.log('✓ Categorías creadas');

}



// PRODUCTOS


const productos = await db.query(
'SELECT COUNT(*) FROM products'
);



if(Number(productos.rows[0].count) === 0){


await db.query(
`
INSERT INTO products
(name,category,price,old_price,stock,active,featured,is_new,description,image_url)

VALUES

($1,$2,$3,$4,$5,$6,$7,$8,$9,$10),

($11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
`,
[

'Lentes de sol Horizonte',
'Accesorios',
28,
0,
14,
1,
1,
0,
'Lentes protección UV400',
'https://picsum.photos/800',


'Bolso tejido Aurora',
'Bolsos',
42.50,
52,
6,
1,
1,
0,
'Bolso artesanal tejido',
'https://picsum.photos/801'

]
);


console.log('✓ Productos creados');

}




// CONFIGURACION


const cfg = await db.query(
'SELECT COUNT(*) FROM config'
);


if(Number(cfg.rows[0].count) === 0){


await db.query(
`
INSERT INTO config(key,value)
VALUES
($1,$2),
($3,$4),
($5,$6)
`,
[
'businessName',
'Prisma',

'whatsapp',
process.env.WHATSAPP_NUMBER,

'address',
'Quito Ecuador'
]
);


console.log('✓ Configuración creada');

}



console.log('\n🌈 Neon lista con datos iniciales');


process.exit();


}catch(error){

console.error(error);
process.exit(1);

}


}


seed();