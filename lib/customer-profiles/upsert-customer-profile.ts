import { type Prisma } from "@prisma/client";

type UpsertCustomerProfileInput = {
  customerName?: string | null;
  customerEmail?: string | null;
  customerWhatsapp?: string | null;
};

export async function upsertCustomerProfile(
  tx: Prisma.TransactionClient,
  brandId: string,
  payload: UpsertCustomerProfileInput,
) {
  if (!payload.customerEmail && !payload.customerWhatsapp) {
    return null;
  }

  const emailProfile = payload.customerEmail
    ? await tx.customerProfile.findUnique({
        where: {
          brandId_email: {
            brandId,
            email: payload.customerEmail,
          },
        },
      })
    : null;

  const whatsappProfile = payload.customerWhatsapp
    ? await tx.customerProfile.findUnique({
        where: {
          brandId_whatsapp: {
            brandId,
            whatsapp: payload.customerWhatsapp,
          },
        },
      })
    : null;

  const matchedProfile = emailProfile || whatsappProfile || null;

  if (!matchedProfile) {
    return tx.customerProfile.create({
      data: {
        brandId,
        name: payload.customerName,
        email: payload.customerEmail,
        whatsapp: payload.customerWhatsapp,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
      },
    });
  }

  const canSyncEmail =
    payload.customerEmail &&
    (!whatsappProfile || whatsappProfile.id === matchedProfile.id);
  const canSyncWhatsapp =
    payload.customerWhatsapp &&
    (!emailProfile || emailProfile.id === matchedProfile.id);

  return tx.customerProfile.update({
    where: { id: matchedProfile.id },
    data: {
      name: payload.customerName ?? matchedProfile.name,
      email: canSyncEmail ? payload.customerEmail : matchedProfile.email,
      whatsapp: canSyncWhatsapp ? payload.customerWhatsapp : matchedProfile.whatsapp,
      lastSeenAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}
