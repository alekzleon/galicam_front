const slugify = (text) => {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

const baseProducts = [
  {
    id: 1,
    name: "Coca-Cola Original 600 ml Paquete 24 piezas",
    brand: "Coca-Cola",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
    price: 289,
    oldPrice: 349,
    rating: 4.8,
    sold: "+1,200 vendidos",
    discountLabel: "17% OFF",
    shipping: "Envío gratis",
    badges: ["MÁS VENDIDO"],
  },
  {
    id: 2,
    name: "Sabritas Original 45 g Caja con 40 piezas",
    brand: "Sabritas",
    image: "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?auto=format&fit=crop&w=900&q=80",
    price: 315,
    oldPrice: 389,
    rating: 4.7,
    sold: "+980 vendidos",
    discountLabel: "19% OFF",
    shipping: "Entrega local",
    badges: ["OFERTA"],
  },
  {
    id: 3,
    name: "Galletas Marías Gamesa 170 g Caja con 12 piezas",
    brand: "Gamesa",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=80",
    price: 169,
    oldPrice: 204,
    rating: 4.9,
    sold: "+650 vendidos",
    discountLabel: "17% OFF",
    shipping: "Envío gratis",
    badges: ["NUEVO"],
  },
  {
    id: 4,
    name: "Leche Lala Entera 1 L Caja con 12 piezas",
    brand: "Lala",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
    price: 269,
    oldPrice: 320,
    rating: 4.8,
    sold: "+1,500 vendidos",
    discountLabel: "16% OFF",
    shipping: "Llega mañana",
    badges: ["MAYOREO"],
  },
  {
    id: 5,
    name: "Aceite Capullo 850 ml Paquete con 6 piezas",
    brand: "Capullo",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
    price: 189,
    oldPrice: 240,
    rating: 4.7,
    sold: "+540 vendidos",
    discountLabel: "21% OFF",
    shipping: "Envío gratis",
    badges: [],
  },
  {
    id: 6,
    name: "Arroz Verde Valle 900 g Paquete 12 piezas",
    brand: "Verde Valle",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
    price: 279,
    oldPrice: 348,
    rating: 4.6,
    sold: "+420 vendidos",
    discountLabel: "20% OFF",
    shipping: "Entrega local",
    badges: ["OFERTA", "MAYOREO"],
  },
  {
    id: 7,
    name: "Frijol Pinto 900 g Paquete 10 piezas",
    brand: "La Merced",
    image: "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80",
    price: 239,
    oldPrice: 299,
    rating: 4.5,
    sold: "+300 vendidos",
    discountLabel: "20% OFF",
    shipping: "Envío gratis",
    badges: [],
  },
  {
    id: 8,
    name: "Detergente Ariel 850 g Caja con 10 piezas",
    brand: "Ariel",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
    price: 339,
    oldPrice: 420,
    rating: 4.9,
    sold: "+870 vendidos",
    discountLabel: "19% OFF",
    shipping: "Llega mañana",
    badges: ["OFERTA"],
  },
  {
    id: 9,
    name: "Jabón Zote Blanco 400 g Paquete 20 piezas",
    brand: "Zote",
    image: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=900&q=80",
    price: 259,
    oldPrice: 310,
    rating: 4.8,
    sold: "+710 vendidos",
    discountLabel: "16% OFF",
    shipping: "Envío gratis",
    badges: ["MAYOREO"],
  },
  {
    id: 10,
    name: "Cloralex 1 L Caja con 12 piezas",
    brand: "Cloralex",
    image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=900&q=80",
    price: 219,
    oldPrice: 264,
    rating: 4.7,
    sold: "+460 vendidos",
    discountLabel: "17% OFF",
    shipping: "Entrega local",
    badges: ["NUEVO"],
  },
]

const brands = [
  "Coca-Cola", "Sabritas", "Gamesa", "Lala", "Capullo",
  "Verde Valle", "Ariel", "Zote", "Cloralex", "Bimbo",
]

const suffixes = [
  "Mayoreo", "Paquete ahorro", "Caja surtida", "Presentación negocio", "Promo especial"
]

const badgeVariants = [
  [],
  ["OFERTA"],
  ["MÁS VENDIDO"],
  ["NUEVO"],
  ["MAYOREO"],
  ["OFERTA", "MAYOREO"],
]

export const mockProducts = Array.from({ length: 50 }, (_, index) => {
  const base = baseProducts[index % baseProducts.length]
  const variantNumber = index + 1

  const name = `${base.name} ${suffixes[index % suffixes.length]}`

  return {
    ...base,
    id: variantNumber,
    slug: `${slugify(name)}-${variantNumber}`,
    brand: brands[index % brands.length],
    name,
    price: base.price + (index % 5) * 7,
    oldPrice: base.oldPrice + (index % 4) * 9,
    rating: Number((4.5 + (index % 5) * 0.1).toFixed(1)),
    sold: `+${300 + index * 37} vendidos`,
    badges: badgeVariants[index % badgeVariants.length],
  }
})