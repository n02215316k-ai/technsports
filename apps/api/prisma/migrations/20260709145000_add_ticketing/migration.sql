CREATE TYPE "TicketOrderStatus" AS ENUM ('RESERVED', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED');
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'CHECKED_IN', 'VOID', 'REFUNDED');

CREATE TABLE "TicketProduct" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "quantityTotal" INTEGER NOT NULL,
  "quantitySold" INTEGER NOT NULL DEFAULT 0,
  "perOrderLimit" INTEGER NOT NULL DEFAULT 10,
  "saleStartsAt" TIMESTAMP(3),
  "saleEndsAt" TIMESTAMP(3),
  "gate" TEXT,
  "section" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketOrder" (
  "id" TEXT NOT NULL,
  "publicRef" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT,
  "buyerName" TEXT NOT NULL,
  "buyerEmail" TEXT NOT NULL,
  "buyerPhone" TEXT,
  "status" "TicketOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paymentMethod" TEXT NOT NULL,
  "paymentReference" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  CONSTRAINT "TicketOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "ticketCode" TEXT NOT NULL,
  "qrPayload" TEXT NOT NULL,
  "holderName" TEXT NOT NULL,
  "holderEmail" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedInAt" TIMESTAMP(3),
  "checkInDevice" TEXT,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketProduct_matchId_name_key" ON "TicketProduct"("matchId", "name");
CREATE INDEX "TicketProduct_matchId_active_idx" ON "TicketProduct"("matchId", "active");
CREATE UNIQUE INDEX "TicketOrder_publicRef_key" ON "TicketOrder"("publicRef");
CREATE INDEX "TicketOrder_matchId_status_idx" ON "TicketOrder"("matchId", "status");
CREATE INDEX "TicketOrder_buyerEmail_idx" ON "TicketOrder"("buyerEmail");
CREATE UNIQUE INDEX "Ticket_ticketCode_key" ON "Ticket"("ticketCode");
CREATE INDEX "Ticket_matchId_status_idx" ON "Ticket"("matchId", "status");
CREATE INDEX "Ticket_orderId_idx" ON "Ticket"("orderId");

ALTER TABLE "TicketProduct" ADD CONSTRAINT "TicketProduct_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketOrderItem" ADD CONSTRAINT "TicketOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketOrderItem" ADD CONSTRAINT "TicketOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TicketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TicketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
