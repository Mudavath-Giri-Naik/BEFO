import { describe, expect, it } from "vitest"
import { hookSecret, maskPhone, msg91Request } from "../../supabase/functions/_shared/sms"

describe("sms-hook helpers", () => {
  it("strips the Supabase secret prefix", () => {
    expect(hookSecret("v1,whsec_abc+/=")).toBe("abc+/=")
    expect(hookSecret("whsec_xyz")).toBe("xyz")
  })
  it("masks phones in logs", () => expect(maskPhone("+919876543210")).toBe("+91 98•••••210"))
  it("builds the MSG91 request", () => {
    const r = msg91Request({ MSG91_AUTH_KEY: "k", MSG91_TEMPLATE_ID: "t1" }, "+919876543210", "123456")
    expect(r.url).toBe("https://control.msg91.com/api/v5/otp?template_id=t1&mobile=919876543210&otp=123456")
    expect(r.init.headers.authkey).toBe("k")
  })
  it("rejects non-Indian numbers and bad OTPs", () => {
    expect(() => msg91Request({ MSG91_AUTH_KEY: "k", MSG91_TEMPLATE_ID: "t" }, "+14155550100", "123456")).toThrow()
    expect(() => msg91Request({ MSG91_AUTH_KEY: "k", MSG91_TEMPLATE_ID: "t" }, "+919876543210", "12ab")).toThrow()
  })
})
