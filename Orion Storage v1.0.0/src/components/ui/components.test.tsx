import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, IconButton } from "./button";
import { Field } from "./field";
import { Input, Select, Textarea } from "./controls";
import { Alert, StatusIndicator } from "./feedback";
import { BoxCode, DataTable, LocationCode } from "./surfaces";

describe("shared UI accessibility contracts", () => {
  it("blocks a loading submit button and preserves its accessible text", () => {
    const markup = renderToStaticMarkup(
      <Button type="submit" loading>
        Salvar caixa
      </Button>,
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Salvar caixa");
    expect(renderToStaticMarkup(<Button>Cancelar</Button>)).toContain('type="button"');
  });
  it("exposes both states of a toggle and an icon-only button name", () => {
    expect(renderToStaticMarkup(<Button selected>Filtro</Button>)).toContain('aria-pressed="true"');
    expect(renderToStaticMarkup(<Button selected={false}>Filtro</Button>)).toContain(
      'aria-pressed="false"',
    );
    expect(renderToStaticMarkup(<IconButton aria-label="Fechar">×</IconButton>)).toContain(
      'aria-label="Fechar"',
    );
  });
  it("keeps native control attributes and explicit field error relationships", () => {
    const markup = renderToStaticMarkup(
      <Field label="Nome" htmlFor="name" error="Informe o nome">
        <Input id="name" aria-invalid aria-describedby="name-error" />
      </Field>,
    );
    expect(markup).toContain('for="name"');
    expect(markup).toContain('aria-describedby="name-error"');
    expect(markup).toContain('id="name-error"');
    expect(markup).toContain('role="alert"');
    const linked = renderToStaticMarkup(
      <Field label="Código" htmlFor="code" required hint="Código único" error="Código inválido">
        <Input id="code" aria-describedby="other" />
      </Field>,
    );
    expect(linked).toContain('aria-describedby="other code-hint code-error"');
    expect(linked).toContain('aria-required="true"');
    expect(linked).toContain('aria-invalid="true"');
    expect(
      renderToStaticMarkup(
        <Select disabled defaultValue="a">
          <option value="a">Área</option>
        </Select>,
      ),
    ).toContain('disabled=""');
    expect(
      renderToStaticMarkup(<Textarea name="notes" readOnly defaultValue="Observação" />),
    ).toContain("Observação");
  });
  it("announces errors and preserves status text without relying on color", () => {
    expect(renderToStaticMarkup(<Alert tone="danger">Código inválido</Alert>)).toContain(
      'role="alert"',
    );
    expect(renderToStaticMarkup(<Alert tone="success">Salvo</Alert>)).toContain('role="status"');
    const markup = renderToStaticMarkup(<StatusIndicator tone="warning">Aberta</StatusIndicator>);
    expect(markup).toContain("Aberta");
    expect(markup).toContain('aria-hidden="true"');
  });
  it("names a keyboard-accessible table and preserves technical identifiers verbatim", () => {
    const markup = renderToStaticMarkup(
      <DataTable label="Caixas">
        <tbody>
          <tr>
            <td>
              <BoxCode>BOX-000001</BoxCode>
            </td>
            <td>
              <LocationCode>SUP-A-01-01-01</LocationCode>
            </td>
          </tr>
        </tbody>
      </DataTable>,
    );
    expect(markup).toContain('role="region"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain("<caption");
    expect(markup).toContain("BOX-000001");
    expect(markup).toContain("SUP-A-01-01-01");
  });
});
