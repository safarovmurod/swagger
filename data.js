// База данных — маълумоти мағозаи молҳои бачагона
// Ҳар кас метавонад ин маълумотро тавассути GET-запрос гирад

const categories = [
  { id: 1, name: "Игрушки", description: "Развивающие игры и игрушки для всех возрастов", image: "https://images.unsplash.com/photo-1558084666-f8aba1e3a3b8?w=400", slug: "toys" },
  { id: 2, name: "Одежда", description: "Одежда для новорождённых и детей до 10 лет", image: "https://images.unsplash.com/photo-1519278429378-e06883480ee6?w=400", slug: "clothes" },
  { id: 3, name: "Обувь", description: "Удобная и качественная детская обувь", image: "https://images.unsplash.com/photo-1514929989863-5cf2260b5881?w=400", slug: "shoes" },
  { id: 4, name: "Книги", description: "Книги, сказки и обучающие пособия для детей", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400", slug: "books" },
  { id: 5, name: "Детская комната", description: "Мебель и декор для детской комнаты", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068068c?w=400", slug: "nursery" },
  { id: 6, name: "Гигиена и уход", description: "Средства гигиены и ухода за малышом", image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400", slug: "hygiene" },
  { id: 7, name: "Питание", description: "Детское питание и прикорм для всех возрастов", image: "https://images.unsplash.com/photo-1547592182-6371e6f2d27e?w=400", slug: "food" },
  { id: 8, name: "Спорт и активность", description: "Спортивные товары и товары для активного отдыха", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400", slug: "sport" }
];

const products = [
  // === Игрушки (1) ===
  { id: 1, name: "Конструктор «Город» 120 деталей", description: "Развивающий конструктор с 120 яркими деталями. Развивает мелкую моторику и пространственное мышление.", price: 145, oldPrice: 180, categoryId: 1, image: "https://images.unsplash.com/photo-1558084666-f8aba1e3a3b8?w=600", rating: 4.8, inStock: true, ageGroup: "3-7 лет" },
  { id: 2, name: "Мягкая игрушка «Мишка»", description: "Плюшевый медведь 30 см. Гипоаллергенный наполнитель, можно стирать.", price: 85, oldPrice: null, categoryId: 1, image: "https://images.unsplash.com/photo-1559453001-ee83ef38c473?w=600", rating: 4.9, inStock: true, ageGroup: "0-10 лет" },
  { id: 3, name: "Деревянные кубики с алфавитом", description: "Набор из 30 деревянных кубиков с буквами алфавита и цифрами.", price: 120, oldPrice: 150, categoryId: 1, image: "https://images.unsplash.com/photo-1587654780291-1391c44b5f8a?w=600", rating: 4.7, inStock: true, ageGroup: "2-5 лет" },
  { id: 4, name: "Машинка радиоуправляемая", description: "Спортивная машина на радиоуправлении. Скорость до 15 км/ч.", price: 220, oldPrice: 280, categoryId: 1, image: "https://images.unsplash.com/photo-1591960991621-7439c32a00b8?w=600", rating: 4.6, inStock: true, ageGroup: "5-12 лет" },
  { id: 5, name: "Набор для творчества", description: "Краски, кисти, карандаши, пластилин — всё для творчества в одном наборе.", price: 95, oldPrice: null, categoryId: 1, image: "https://images.unsplash.com/photo-1513423244312-9a1e9b6b7c8a?w=600", rating: 4.5, inStock: true, ageGroup: "3-10 лет" },

  // === Одежда (2) ===
  { id: 6, name: "Костюм детский «Зайчик»", description: "Тёплый костюм для новорождённых. 100% хлопок, мягкая ткань.", price: 130, oldPrice: 160, categoryId: 2, image: "https://images.unsplash.com/photo-1519278429378-e06883480ee6?w=600", rating: 4.8, inStock: true, ageGroup: "0-1 год" },
  { id: 7, name: "Платье для девочки", description: "Нарядное платье из хлопка. Идеально для праздника.", price: 110, oldPrice: null, categoryId: 2, image: "https://images.unsplash.com/photo-1518831959646-7e8a3c7ed7b2?w=600", rating: 4.7, inStock: true, ageGroup: "3-8 лет" },
  { id: 8, name: "Комбинезон тёплый", description: "Зимний комбинезон с капюшоном. Водоотталкивающая ткань.", price: 340, oldPrice: 420, categoryId: 2, image: "https://images.unsplash.com/photo-1544057967878-7b0e1c44b3c3?w=600", rating: 4.9, inStock: true, ageGroup: "1-5 лет" },
  { id: 9, name: "Футболка с принтом", description: "Хлопковая футболка с весёлым принтом. Размеры 80-140.", price: 55, oldPrice: 70, categoryId: 2, image: "https://images.unsplash.com/photo-1503944583220-79d0322a8178?w=600", rating: 4.4, inStock: true, ageGroup: "2-10 лет" },

  // === Обувь (3) ===
  { id: 10, name: "Кроссовки детские", description: "Лёгкие кроссовки с ортопедической стелькой. Размеры 28-34.", price: 150, oldPrice: 190, categoryId: 3, image: "https://images.unsplash.com/photo-1514929989863-5cf2260b5881?w=600", rating: 4.7, inStock: true, ageGroup: "5-10 лет" },
  { id: 11, name: "Сандалии летние", description: "Дышащие сандалии для жаркой погоды. Натуральная кожа.", price: 90, oldPrice: null, categoryId: 3, image: "https://images.unsplash.com/photo-1603487742131-2056c2e5b3b0?w=600", rating: 4.5, inStock: true, ageGroup: "3-8 лет" },
  { id: 12, name: "Зимние ботинки", description: "Тёплые ботинки с мехом. Водоотталкивающие. Размеры 26-34.", price: 250, oldPrice: 310, categoryId: 3, image: "https://images.unsplash.com/photo-1605812860427-4024433d70f0?w=600", rating: 4.8, inStock: true, ageGroup: "4-10 лет" },

  // === Книги (4) ===
  { id: 13, name: "Сборник сказок «365 сказок»", description: "365 сказок на каждый день. Красочные иллюстрации. Твёрдый переплёт.", price: 75, oldPrice: 95, categoryId: 4, image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600", rating: 4.9, inStock: true, ageGroup: "3-10 лет" },
  { id: 14, name: "Книга-картонка «Животные»", description: "Книжка из плотного картона для малышей. Яркие картинки животных.", price: 45, oldPrice: null, categoryId: 4, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600", rating: 4.6, inStock: true, ageGroup: "0-3 года" },
  { id: 15, name: "Обучающая книга «Алфавит»", description: "Изучаем алфавит с картинками и заданиями. 48 страниц.", price: 60, oldPrice: 75, categoryId: 4, image: "https://images.unsplash.com/photo-1513001900722-370faff1bfed?w=600", rating: 4.7, inStock: true, ageGroup: "4-7 лет" },

  // === Детская комната (5) ===
  { id: 16, name: "Детская кроватка", description: "Деревянная кроватка с регулировкой высоты. Материал: берёза.", price: 450, oldPrice: 550, categoryId: 5, image: "https://images.unsplash.com/photo-1505693416388-ac5ce068068c?w=600", rating: 4.8, inStock: true, ageGroup: "0-5 лет" },
  { id: 17, name: "Комод для детской", description: "Комод с 4 ящиками. Безопасные направляющие, защита от защемления.", price: 380, oldPrice: null, categoryId: 5, image: "https://images.unsplash.com/photo-1558959420-1b6c6c7c7c7c?w=600", rating: 4.6, inStock: true, ageGroup: "0-10 лет" },
  { id: 18, name: "Ночник «Звёздное небо»", description: "Проекционный ночник с эффектом звёздного неба. 3 режима подсветки.", price: 65, oldPrice: 85, categoryId: 5, image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600", rating: 4.7, inStock: true, ageGroup: "0-10 лет" },

  // === Гигиена (6) ===
  { id: 19, name: "Подгузники (упаковка 60 шт)", description: "Подгузники для чувствительной кожи. Размер 3 (4-9 кг).", price: 85, oldPrice: 100, categoryId: 6, image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600", rating: 4.8, inStock: true, ageGroup: "0-2 года" },
  { id: 20, name: "Детский шампунь 250мл", description: "Без слёз. Натуральные ингредиенты. PH-нейтральный.", price: 35, oldPrice: null, categoryId: 6, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600", rating: 4.5, inStock: true, ageGroup: "0-10 лет" },

  // === Питание (7) ===
  { id: 21, name: "Пюре фруктовое (набор 12 шт)", description: "Натуральное фруктовое пюре без сахара. Яблоко, груша, банан.", price: 55, oldPrice: 65, categoryId: 7, image: "https://images.unsplash.com/photo-1547592182-6371e6f2d27e?w=600", rating: 4.7, inStock: true, ageGroup: "6 мес - 3 года" },
  { id: 22, name: "Детская каша (5 вкусов)", description: "Безмолочная каша с витаминами. 5 видов: гречка, рис, овсянка, кукуруза, мульти grain.", price: 45, oldPrice: null, categoryId: 7, image: "https://images.unsplash.com/photo-1567620905720-5c5e7c5c5c5c?w=600", rating: 4.6, inStock: true, ageGroup: "6 мес - 2 года" },

  // === Спорт (8) ===
  { id: 23, name: "Балансировочный самокат", description: "Развивает координацию и равновесие. Колёса из полиуретана.", price: 180, oldPrice: 220, categoryId: 8, image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600", rating: 4.8, inStock: true, ageGroup: "2-6 лет" },
  { id: 24, name: "Мяч футбольный детский", description: "Лёгкий футбольный мяч размер 3. Подходит для улицы и зала.", price: 50, oldPrice: 65, categoryId: 8, image: "https://images.unsplash.com/photo-1614632537190-23e4b15c9938?w=600", rating: 4.5, inStock: true, ageGroup: "4-10 лет" },
  { id: 25, name: "Детский велосипед 12\"", description: "Беговел с надувными колёсами. Регулируемое сиденье.", price: 290, oldPrice: 350, categoryId: 8, image: "https://images.unsplash.com/photo-1532330393533-44de0d5ad6d7?w=600", rating: 4.9, inStock: true, ageGroup: "2-5 лет" }
];

module.exports = { categories, products };
