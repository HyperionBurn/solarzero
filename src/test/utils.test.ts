import { describe, it, expect } from "vitest";
import { escapeHtml, cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves Tailwind conflicts", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles array arguments", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("handles mixed array and string arguments", () => {
    expect(cn("px-4", ["py-2", "mx-1"])).toBe("px-4 py-2 mx-1");
  });

  it("ignores null and undefined", () => {
    expect(cn("px-4", null, undefined, "py-2")).toBe("px-4 py-2");
  });

  it("handles object arguments", () => {
    expect(cn({ "px-4": true, "hidden": false })).toBe("px-4");
  });

  it("resolves complex Tailwind conflicts across arguments", () => {
    expect(cn("px-4 py-2", "px-6", { "py-4": true })).toBe("px-6 py-4");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("returns clean strings unchanged", () => {
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes mixed special characters", () => {
    expect(escapeHtml('<b class="x">text</b>')).toBe(
      "&lt;b class=&quot;x&quot;&gt;text&lt;/b&gt;"
    );
  });

  it("preserves already escaped entities", () => {
    expect(escapeHtml("&amp; &lt;")).toBe("&amp;amp; &amp;lt;");
  });

  it("handles string with only special characters", () => {
    expect(escapeHtml("&<>\""))
      .toBe("&amp;&lt;&gt;&quot;");
  });

  it("handles consecutive special characters", () => {
    expect(escapeHtml("<<>>")).toBe("&lt;&lt;&gt;&gt;");
  });
});
