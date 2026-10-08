import type { Box, Product } from "@orion/domain";

import { BoxLabel } from "@/features/identification/box-label";

export function ReceiptLabelSheet({ boxes, products }: { boxes: Box[]; products: Product[] }) {
  const ordered = [...boxes].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <div className="orion-label-sheet">
      {ordered.map((box) => (
        <BoxLabel
          key={box.id}
          box={box}
          product={products.find((product) => product.id === box.productId) ?? null}
        />
      ))}
    </div>
  );
}
