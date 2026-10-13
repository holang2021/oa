CREATE TABLE "opportunity_product_intents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "opportunity_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "opportunity_product_intents_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "opportunity_product_intents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "opportunity_product_intents_opportunity_id_product_id_key"
  ON "opportunity_product_intents"("opportunity_id", "product_id");

CREATE INDEX "opportunity_product_intents_product_id_idx"
  ON "opportunity_product_intents"("product_id");
