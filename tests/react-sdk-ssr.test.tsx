import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VisitoringProvider } from "../packages/react/src/index";

describe("@visitoring/react server rendering", () => {
  it("renders without reading browser globals", () => {
    expect(() =>
      renderToString(
        <VisitoringProvider siteKey="vk_server_render">
          <main>Application</main>
        </VisitoringProvider>,
      ),
    ).not.toThrow();
  });
});
