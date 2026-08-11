"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put, del } from "@vercel/blob";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ProductCategory } from "@/generated/prisma/client";
import { slugify, sanitizeSkuPart, randomSkuSuffix } from "@/lib/slug";

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.enum(ProductCategory),
  description: z.string().trim().optional(),
  price: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  quantity: z.coerce.number().int().min(0),
  published: z.coerce.boolean(),
  poNumber: z.string().trim().optional(),
  jobNumber: z.string().trim().optional(),
  callSize: z.string().trim().optional(),
  exteriorColor: z.string().trim().optional(),
  interiorColor: z.string().trim().optional(),
  handing: z.string().trim().optional(),
  option1: z.string().trim().optional(),
  option2: z.string().trim().optional(),
  option3: z.string().trim().optional(),
  jambDepth: z.string().trim().optional(),
  miscNotes: z.string().trim().optional(),
});

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s ? s : null;
}

function parseProductForm(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description") ?? undefined,
    price: formData.get("price") ?? undefined,
    quantity: formData.get("quantity") ?? "0",
    published: formData.get("published") === "on",
    poNumber: formData.get("poNumber") ?? undefined,
    jobNumber: formData.get("jobNumber") ?? undefined,
    callSize: formData.get("callSize") ?? undefined,
    exteriorColor: formData.get("exteriorColor") ?? undefined,
    interiorColor: formData.get("interiorColor") ?? undefined,
    handing: formData.get("handing") ?? undefined,
    option1: formData.get("option1") ?? undefined,
    option2: formData.get("option2") ?? undefined,
    option3: formData.get("option3") ?? undefined,
    jambDepth: formData.get("jambDepth") ?? undefined,
    miscNotes: formData.get("miscNotes") ?? undefined,
  };

  const parsed = productSchema.parse(raw);
  return {
    name: parsed.name,
    category: parsed.category,
    description: emptyToNull(parsed.description ?? null),
    price: parsed.price,
    quantity: parsed.quantity,
    published: parsed.published,
    poNumber: emptyToNull(parsed.poNumber ?? null),
    jobNumber: emptyToNull(parsed.jobNumber ?? null),
    callSize: emptyToNull(parsed.callSize ?? null),
    exteriorColor: emptyToNull(parsed.exteriorColor ?? null),
    interiorColor: emptyToNull(parsed.interiorColor ?? null),
    handing: emptyToNull(parsed.handing ?? null),
    option1: emptyToNull(parsed.option1 ?? null),
    option2: emptyToNull(parsed.option2 ?? null),
    option3: emptyToNull(parsed.option3 ?? null),
    jambDepth: emptyToNull(parsed.jambDepth ?? null),
    miscNotes: emptyToNull(parsed.miscNotes ?? null),
  };
}

export async function createProduct(formData: FormData) {
  const data = parseProductForm(formData);

  const skuBase = `MANUAL-${sanitizeSkuPart(data.name).slice(0, 12)}-${randomSkuSuffix()}`;
  const slug = `${slugify(data.name)}-${skuBase.toLowerCase()}`;

  const product = await prisma.product.create({
    data: {
      ...data,
      sku: skuBase,
      slug,
      lineNumbers: [],
    },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const data = parseProductForm(formData);

  await prisma.product.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function deleteProduct(id: string) {
  const images = await prisma.productImage.findMany({ where: { productId: id } });
  for (const image of images) {
    await del(image.url).catch(() => {});
  }
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function setPublished(id: string, published: boolean) {
  await prisma.product.update({ where: { id }, data: { published } });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function addProductImage(productId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const maxPosition = await prisma.productImage.aggregate({
    where: { productId },
    _max: { position: true },
  });

  const blob = await put(`products/${productId}/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await prisma.productImage.create({
    data: {
      productId,
      url: blob.url,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProductImage(imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  await del(image.url).catch(() => {});
  await prisma.productImage.delete({ where: { id: imageId } });

  revalidatePath(`/admin/products/${image.productId}`);
}
