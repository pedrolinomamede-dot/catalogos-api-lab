# DOMAIN_MAP - Current System (MVP v1)

This document maps the current domain as implemented in the codebase. It is factual and read-only.

## Sources reviewed
- prisma/schema.prisma
- types/api.ts
- app/api/** (route handlers)
- lib/auth.ts
- lib/api/*.ts
- lib/validators/*.ts
- app/(auth)/**, app/dashboard/**, app/[brandSlug]/**, components/**

## Backend data entities (Prisma models)

### Brand
Fields: id, name, slug, logoUrl?, createdAt, updatedAt
Relations: users, categories, products, variations, images
Location: prisma/schema.prisma

### User
Fields: id, brandId, name?, email, passwordHash, role (UserRole), createdAt, updatedAt
Relations: brand
Enum: UserRole = ADMIN | VIEWER
Location: prisma/schema.prisma
Auth usage: lib/auth.ts (Credentials provider reads prisma.user and adds brandId/role to JWT and session)

### Category
Fields: id, brandId, name, icon?, color?, sortOrder, createdAt, updatedAt
Relations: brand, products
Location: prisma/schema.prisma

### Product
Fields: id, brandId, sku, name, description?, categoryId?, isActive, createdAt, updatedAt
Relations: brand, category (optional), variations
Location: prisma/schema.prisma

### ProductVariation
Fields: id, brandId, productId, variantType?, variantValue?, price, stockQuantity, barcode?, createdAt, updatedAt
Relations: brand, product, images
Location: prisma/schema.prisma

### ProductImage
Fields: id, brandId, variationId, imageUrl, thumbnailUrl?, altText?, sortOrder, createdAt, updatedAt
Relations: brand, variation
Location: prisma/schema.prisma

## Constraints and indexes observed in schema
- Brand.slug is unique
- Category unique: (brandId, name); index: brandId
- Product unique: (brandId, sku); indexes: brandId, updatedAt, categoryId, sku
- ProductVariation index: (productId, brandId)
- ProductImage index: (variationId, brandId)

## Relationship summary (observed)
- Brand 1..* Users, Categories, Products, ProductVariations, ProductImages
- Category belongs to Brand; Product optionally references Category (onDelete: SetNull)
- Product belongs to Brand and has many ProductVariations
- ProductVariation belongs to Brand and Product; has many ProductImages
- ProductImage belongs to Brand and ProductVariation

## Backend surface (App Router API routes)
- Auth: app/api/auth/[...nextauth], app/api/auth/me, app/api/auth/signup
- Brands: app/api/brands, app/api/brands/[id]
- Categories: app/api/categories, app/api/categories/[id]
- Products: app/api/products, app/api/products/[id], app/api/products/bulk
- Variations: app/api/products/[id]/variations, app/api/products/[id]/variations/[variationId], app/api/variations/[variationId]
- Variation images: app/api/variations/[variationId]/images, app/api/variations/[variationId]/images/[imageId], app/api/variations/[variationId]/images/reorder
- Images upload: app/api/images/upload, app/api/uploads/images
- Public catalog: app/api/public/brands/[slug], app/api/public/categories, app/api/public/products, app/api/public/products/[id]

## Frontend surface (UI + client)
- Auth UI: app/(auth)/login, app/(auth)/signup; components/auth/*
- Admin UI: app/dashboard/*; components/admin/*
- Public catalog UI: app/[brandSlug]/page.tsx, app/[brandSlug]/products/[id]/page.tsx; components/public/*
- API client + types: lib/api/*.ts, types/api.ts
- Client fetch default: credentials included (lib/api/client.ts)

## Exists vs not present in code (as observed)

Exists:
- Prisma models: Brand, User, Category, Product, ProductVariation, ProductImage
- API route groups: auth, brands, categories, products, variations, images, uploads, public
- Frontend data types in types/api.ts for Brand, Category, Product, ProductVariation, ProductImage

Not present in prisma/schema.prisma:
- No models named Catalog, ShareLink, Subcategory, or Pdf
- No model other than Product representing a separate base product entity

Not present as API route directories under app/api:
- No route folders named catalogs, share-links, or pdfs
