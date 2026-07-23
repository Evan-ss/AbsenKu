import { z } from "zod";

export const createSiswaSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama harus diisi")
    .max(100, "Nama maksimal 100 karakter"),
  nis: z
    .string()
    .min(1, "NIS harus diisi")
    .max(20, "NIS maksimal 20 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password maksimal 100 karakter"),
  kelasId: z
    .string()
    .uuid("Kelas tidak valid")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export const updateSiswaSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama harus diisi")
    .max(100, "Nama maksimal 100 karakter")
    .optional(),
  nis: z
    .string()
    .min(1, "NIS harus diisi")
    .max(20, "NIS maksimal 20 karakter")
    .optional(),
  email: z.string().email("Email tidak valid").optional(),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password maksimal 100 karakter")
    .optional(),
  kelasId: z
    .string()
    .uuid("Kelas tidak valid")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  isActive: z.boolean().optional(),
});

export type CreateSiswaInput = z.infer<typeof createSiswaSchema>;
export type UpdateSiswaInput = z.infer<typeof updateSiswaSchema>;
