import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const taxonomy = [
  {
    slug: "roofing",
    name: "Roofing",
    sortOrder: 1,
    services: [
      { slug: "asphalt-shingle-roofing", name: "Asphalt Shingle Roofing", licensed: true },
      { slug: "metal-roofing", name: "Metal Roofing", licensed: true },
      { slug: "flat-roofing", name: "Flat Roofing", licensed: true },
      { slug: "tile-roofing", name: "Tile Roofing", licensed: true },
      { slug: "roof-repair", name: "Roof Repair", licensed: true },
      { slug: "roof-inspection", name: "Roof Inspection", licensed: false },
      { slug: "gutter-installation", name: "Gutter Installation", licensed: false },
    ],
  },
  {
    slug: "concrete",
    name: "Concrete",
    sortOrder: 2,
    services: [
      { slug: "concrete-driveways", name: "Concrete Driveways", licensed: false },
      { slug: "concrete-patios", name: "Concrete Patios", licensed: false },
      { slug: "stamped-concrete", name: "Stamped Concrete", licensed: false },
      { slug: "concrete-foundations", name: "Concrete Foundations", licensed: true },
      { slug: "concrete-repair", name: "Concrete Repair", licensed: false },
      { slug: "retaining-walls", name: "Retaining Walls", licensed: false },
    ],
  },
  {
    slug: "fencing",
    name: "Fencing",
    sortOrder: 3,
    services: [
      { slug: "wood-fencing", name: "Wood Fencing", licensed: false },
      { slug: "chain-link-fencing", name: "Chain Link Fencing", licensed: false },
      { slug: "iron-fencing", name: "Iron Fencing", licensed: false },
      { slug: "vinyl-fencing", name: "Vinyl Fencing", licensed: false },
      { slug: "fence-repair", name: "Fence Repair", licensed: false },
      { slug: "gate-installation", name: "Gate Installation", licensed: false },
    ],
  },
  {
    slug: "painting",
    name: "Painting",
    sortOrder: 4,
    services: [
      { slug: "interior-painting", name: "Interior Painting", licensed: false },
      { slug: "exterior-painting", name: "Exterior Painting", licensed: false },
      { slug: "commercial-painting", name: "Commercial Painting", licensed: false },
      { slug: "cabinet-painting", name: "Cabinet Painting", licensed: false },
      { slug: "staining", name: "Staining", licensed: false },
      { slug: "pressure-washing", name: "Pressure Washing", licensed: false },
    ],
  },
  {
    slug: "remodeling",
    name: "Remodeling",
    sortOrder: 5,
    services: [
      { slug: "kitchen-remodeling", name: "Kitchen Remodeling", licensed: true },
      { slug: "bathroom-remodeling", name: "Bathroom Remodeling", licensed: true },
      { slug: "room-additions", name: "Room Additions", licensed: true },
      { slug: "garage-conversions", name: "Garage Conversions", licensed: true },
      { slug: "flooring-installation", name: "Flooring Installation", licensed: false },
      { slug: "drywall-installation", name: "Drywall Installation", licensed: false },
      { slug: "trim-and-molding", name: "Trim and Molding", licensed: false },
    ],
  },
  {
    slug: "outdoor-living",
    name: "Outdoor Living",
    sortOrder: 6,
    services: [
      { slug: "patio-covers", name: "Patio Covers", licensed: false },
      { slug: "pergolas", name: "Pergolas", licensed: false },
      { slug: "outdoor-kitchens", name: "Outdoor Kitchens", licensed: true },
      { slug: "decks", name: "Decks", licensed: false },
      { slug: "screen-enclosures", name: "Screen Enclosures", licensed: false },
      { slug: "carports", name: "Carports", licensed: false },
    ],
  },
  {
    slug: "specialty",
    name: "Specialty",
    sortOrder: 7,
    services: [
      { slug: "window-installation", name: "Window Installation", licensed: true },
      { slug: "door-installation", name: "Door Installation", licensed: false },
      { slug: "siding-installation", name: "Siding Installation", licensed: false },
      { slug: "insulation", name: "Insulation", licensed: false },
      { slug: "demolition", name: "Demolition", licensed: false },
      { slug: "general-handyman", name: "General Handyman", licensed: false },
      { slug: "storm-damage-repair", name: "Storm Damage Repair", licensed: true },
    ],
  },
];

const cities = [
  // Dallas-Fort Worth
  { slug: "dallas", name: "Dallas", county: "Dallas", region: "Dallas-Fort Worth" },
  { slug: "fort-worth", name: "Fort Worth", county: "Tarrant", region: "Dallas-Fort Worth" },
  { slug: "arlington", name: "Arlington", county: "Tarrant", region: "Dallas-Fort Worth" },
  { slug: "plano", name: "Plano", county: "Collin", region: "Dallas-Fort Worth" },
  { slug: "irving", name: "Irving", county: "Dallas", region: "Dallas-Fort Worth" },
  { slug: "frisco", name: "Frisco", county: "Collin", region: "Dallas-Fort Worth" },
  { slug: "mckinney", name: "McKinney", county: "Collin", region: "Dallas-Fort Worth" },
  { slug: "denton", name: "Denton", county: "Denton", region: "Dallas-Fort Worth" },
  { slug: "garland", name: "Garland", county: "Dallas", region: "Dallas-Fort Worth" },
  { slug: "grand-prairie", name: "Grand Prairie", county: "Dallas", region: "Dallas-Fort Worth" },
  // Houston
  { slug: "houston", name: "Houston", county: "Harris", region: "Houston" },
  { slug: "sugar-land", name: "Sugar Land", county: "Fort Bend", region: "Houston" },
  { slug: "the-woodlands", name: "The Woodlands", county: "Montgomery", region: "Houston" },
  { slug: "pearland", name: "Pearland", county: "Brazoria", region: "Houston" },
  { slug: "league-city", name: "League City", county: "Galveston", region: "Houston" },
  { slug: "katy", name: "Katy", county: "Harris", region: "Houston" },
  { slug: "pasadena", name: "Pasadena", county: "Harris", region: "Houston" },
  { slug: "baytown", name: "Baytown", county: "Harris", region: "Houston" },
  // San Antonio
  { slug: "san-antonio", name: "San Antonio", county: "Bexar", region: "San Antonio" },
  { slug: "new-braunfels", name: "New Braunfels", county: "Comal", region: "San Antonio" },
  { slug: "san-marcos", name: "San Marcos", county: "Hays", region: "San Antonio" },
  { slug: "boerne", name: "Boerne", county: "Kendall", region: "San Antonio" },
  { slug: "schertz", name: "Schertz", county: "Guadalupe", region: "San Antonio" },
  // Austin
  { slug: "austin", name: "Austin", county: "Travis", region: "Austin" },
  { slug: "round-rock", name: "Round Rock", county: "Williamson", region: "Austin" },
  { slug: "cedar-park", name: "Cedar Park", county: "Williamson", region: "Austin" },
  { slug: "georgetown", name: "Georgetown", county: "Williamson", region: "Austin" },
  { slug: "pflugerville", name: "Pflugerville", county: "Travis", region: "Austin" },
  { slug: "leander", name: "Leander", county: "Williamson", region: "Austin" },
  // El Paso
  { slug: "el-paso", name: "El Paso", county: "El Paso", region: "El Paso" },
  { slug: "las-cruces", name: "Las Cruces", county: "El Paso", region: "El Paso" },
  // Rio Grande Valley
  { slug: "mcallen", name: "McAllen", county: "Hidalgo", region: "Rio Grande Valley" },
  { slug: "brownsville", name: "Brownsville", county: "Cameron", region: "Rio Grande Valley" },
  { slug: "harlingen", name: "Harlingen", county: "Cameron", region: "Rio Grande Valley" },
  { slug: "edinburg", name: "Edinburg", county: "Hidalgo", region: "Rio Grande Valley" },
  // Corpus Christi
  { slug: "corpus-christi", name: "Corpus Christi", county: "Nueces", region: "Corpus Christi" },
  { slug: "portland", name: "Portland", county: "San Patricio", region: "Corpus Christi" },
];

async function main() {
  console.log("Seeding database...");

  // Seed categories and services
  for (const cat of taxonomy) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder },
    });

    for (const svc of cat.services) {
      await prisma.service.upsert({
        where: { slug: svc.slug },
        update: { name: svc.name, licensed: svc.licensed, categoryId: category.id },
        create: {
          slug: svc.slug,
          name: svc.name,
          licensed: svc.licensed,
          categoryId: category.id,
        },
      });
    }
  }

  console.log("Seeded service taxonomy.");

  // Seed cities
  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: { name: city.name, county: city.county, region: city.region },
      create: city,
    });
  }

  console.log("Seeded cities.");

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lonestarcontractinggroup.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const adminName = process.env.ADMIN_NAME || "Robert";

  const hash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, name: adminName, role: Role.ADMIN },
    create: {
      email: adminEmail,
      passwordHash: hash,
      name: adminName,
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${adminEmail}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
