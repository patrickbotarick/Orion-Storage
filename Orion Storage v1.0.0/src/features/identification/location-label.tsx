import { composeLocationLabel, type Location, type StorageArea } from "@orion/domain";

import { QrCode } from "@/features/identification/qr-code";

type LocationLabelProps = {
  location: Pick<Location, "code" | "aisle" | "rack" | "level" | "position">;
  area: Pick<StorageArea, "name"> | null;
};

export function LocationLabel({ location, area }: LocationLabelProps) {
  const model = composeLocationLabel(location, area);
  return (
    <article className="orion-label orion-label-location" data-testid="location-label">
      <p className="orion-kicker">ORION STORAGE</p>
      <h2 className="orion-address">{model.code}</h2>
      <div className="orion-label-qr">
        <QrCode value={model.payload} title={`QR do endereço ${model.code}`} />
      </div>
      <p className="orion-area">{model.areaName}</p>
      <dl className="orion-facts">
        <Fact term="Corredor" value={model.aisle} />
        <Fact term="Prateleira" value={model.rack} />
        <Fact term="Nível" value={model.level} />
        <Fact term="Posição" value={model.position} />
      </dl>
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
