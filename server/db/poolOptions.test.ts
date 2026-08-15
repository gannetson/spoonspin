/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { poolOptions } from "./restaurants";

describe("poolOptions", () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prev;
  });

  it("uses Unix socket for postgresql:///db", () => {
    const opts = poolOptions("postgresql:///spoonspin");
    expect(opts).toMatchObject({
      host: "/var/run/postgresql",
      database: "spoonspin",
    });
    expect(opts).not.toHaveProperty("password");
  });

  it("honors ?host= socket path", () => {
    const opts = poolOptions("postgresql:///spoonspin?host=/tmp");
    expect(opts).toMatchObject({
      host: "/tmp",
      database: "spoonspin",
    });
  });

  it("rewrites production localhost without password to socket", () => {
    process.env.NODE_ENV = "production";
    const opts = poolOptions("postgresql://localhost:5432/spoonspin");
    expect(opts).toMatchObject({
      host: "/var/run/postgresql",
      database: "spoonspin",
    });
    expect(opts).not.toHaveProperty("password");
  });

  it("keeps TCP password auth", () => {
    const opts = poolOptions("postgresql://spoonspin:s3cret@localhost:5432/spoonspin");
    expect(opts).toMatchObject({
      host: "localhost",
      port: 5432,
      database: "spoonspin",
      user: "spoonspin",
      password: "s3cret",
    });
  });
});
