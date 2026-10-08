import { composeBoxLabel, type Box, type Product } from "@orion/domain";
import { formatMeters, formatMillimeters, formatQuantity } from "@orion/shared";

import { QrCode } from "@/features/identification/qr-code";

type BoxLabelProps = {
  box: Pick<Box, "code" | "rollsQuantity" | "totalLengthM" | "manufacturerBatch">;
  product: Product | null;
};

export function BoxLabel({ box, product }: BoxLabelProps) {
  const model = composeBoxLabel(box, product);
  const quantityWord = model.rollLengthM != null ? "rolos" : "unidades";
  return (
    <article className="orion-label orion-label-box" data-testid="box-label">
      <header className="orion-label-head">
        <p className="orion-kicker">ORION STORAGE</p>
        {model.brand ? <p className="orion-brand">{model.brand}</p> : null}
      </header>
      <h2 className="orion-product">{model.productName}</h2>
      {model.colorName ? <p className="orion-color">{model.colorName}</p> : null}
      <dl className="orion-facts">
        {model.widthMm != null ? (
          <Fact term="Largura" value={formatMillimeters(model.widthMm)} />
        ) : null}
        {model.thicknessMm != null ? (
          <Fact term="Espessura" value={formatMillimeters(model.thicknessMm)} />
        ) : null}
        {model.rollLengthM != null ? (
          <Fact term="Rolo" value={formatMeters(model.rollLengthM)} />
        ) : null}
      </dl>
      <p className="orion-total">
        {formatQuantity(model.rollsQuantity)} {quantityWord}
        <span aria-hidden="true"> · </span>
        {formatMeters(model.totalLengthM)}
      </p>
      {model.manufacturerBatch ? (
        <p className="orion-batch">Lote {model.manufacturerBatch}</p>
      ) : null}
      <footer className="orion-label-foot">
        <p className="orion-code">{model.code}</p>
        <QrCode value={model.payload} title={`QR da caixa ${model.code}`} />
      </footer>
    </article>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}
