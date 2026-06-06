import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

const PROD_URL = "https://solarzero.vercel.app";

function extractCookiesFromHeaders(headers: Headers): string {
  let cookies: string[] = [];
  if (typeof headers.getSetCookie === "function") {
    cookies = headers.getSetCookie();
  } else {
    const raw = headers.get("set-cookie");
    if (raw) {
      cookies = raw.split(/,(?=\s*[a-zA-Z0-9_-]+=)/);
    }
  }
  console.log("Set-Cookie headers found:", cookies);
  const parts = cookies.map((c) => {
    const mainPart = c.trim().split(";")[0];
    return mainPart;
  });
  return parts.filter(Boolean).join("; ");
}

describe("Production Smoke Test", () => {
  const shouldRun = process.env.RUN_PRODUCTION_SMOKE === "true";

  it.runIf(shouldRun)("runs the full flow", async () => {
    // Generate a unique email
    const email = `smoke-${Date.now()}@solarzero.com`;
    const password = "smoke-test-password-123";
    const name = "Smoke Test User";

    console.log(`Step 1: Registering user ${email} in production...`);
    
    // 1. Register in production
    const regRes = await fetch(`${PROD_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const regData = await regRes.json();
    console.log("Registration Response:", regRes.status, regData);
    expect(regRes.status).toBe(201);

    // 2. Fetch verification token directly from database
    console.log("Step 2: Fetching verification token from database...");
    // Give DB a tiny moment to commit the registration token
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const tokenRecord = await db.verificationToken.findFirst({
      where: { identifier: email.toLowerCase() },
      orderBy: { expires: "desc" },
    });

    expect(tokenRecord).not.toBeNull();
    const token = tokenRecord!.token;
    console.log(`Found verification token: ${token}`);

    // 3. Verify email in production
    console.log("Step 3: Verifying email in production...");
    const verifyRes = await fetch(`${PROD_URL}/api/auth/verify?token=${token}`, {
      redirect: "manual",
    });

    console.log("Verification Response Status:", verifyRes.status);
    expect([200, 302, 307]).toContain(verifyRes.status);

    // 4. Log in to production
    console.log("Step 4: Authenticating (logging in) to production...");
    
    // First get CSRF token and its cookie
    const csrfRes = await fetch(`${PROD_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    console.log("CSRF Token:", csrfToken);

    const csrfCookie = extractCookiesFromHeaders(csrfRes.headers);
    console.log("CSRF Cookie:", csrfCookie);

    // Now sign in
    const signInBody = new URLSearchParams({
      email,
      password,
      csrfToken,
      callbackUrl: `${PROD_URL}/opportunities`,
    });

    const loginRes = await fetch(`${PROD_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
        ...(csrfCookie ? { Cookie: csrfCookie } : {}),
      },
      body: signInBody.toString(),
    });

    const loginText = await loginRes.text();
    console.log("Login Response Status:", loginRes.status, "Text:", loginText.slice(0, 1000));
    expect(loginRes.status).toBe(200);

    const loginData = JSON.parse(loginText) as { url: string };
    expect(loginData.url).toContain("opportunities");
    const sessionCookies = extractCookiesFromHeaders(loginRes.headers);
    console.log("Session Cookies:", sessionCookies);
    expect(sessionCookies).toContain("session-token");

    // Combine CSRF and Session cookies for subsequent requests
    const requestCookies = [csrfCookie, sessionCookies].filter(Boolean).join("; ");

    // 5. Test opportunities list trpc query
    console.log("Step 5: Fetching opportunities via tRPC query...");
    const trpcBatchUrl = `${PROD_URL}/api/trpc/opportunity.list?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { "json": { limit: 5 } } })
    )}`;

    const opportunitiesRes = await fetch(trpcBatchUrl, {
      headers: {
        Cookie: requestCookies,
      },
    });

    const oppsData = await opportunitiesRes.json();
    console.log("tRPC list response:", opportunitiesRes.status, JSON.stringify(oppsData).slice(0, 500));
    expect(opportunitiesRes.status).toBe(200);

    // Parse opportunities
    const listResult = oppsData[0]?.result?.data?.json;
    expect(listResult).toBeDefined();
    console.log(`Loaded ${listResult.opportunities?.length} opportunities`);

    // 6. Test scan area trpc mutation (protectedProcedure)
    console.log("Step 6: Scanning a small bounding box in Dubai...");
    const scanBody = {
      "0": {
        "json": {
          lat: 25.076,
          lng: 55.154,
          radius: 200,
        }
      }
    };

    const scanRes = await fetch(`${PROD_URL}/api/trpc/opportunity.scanArea?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: requestCookies,
      },
      body: JSON.stringify(scanBody),
    });

    const scanData = await scanRes.json();
    console.log("tRPC scanArea response status:", scanRes.status, "Data:", scanData);
    expect(scanRes.status).toBe(200);
    const scanResult = scanData[0]?.result?.data?.json;
    expect(scanResult.status).toBe("completed");
    console.log(`Scan completed. Buildings found: ${scanResult.buildingsFound}, Opportunities created: ${scanResult.opportunitiesCreated}`);

    // Fetch the new opportunities created to get one of their IDs
    const freshOppsRes = await fetch(trpcBatchUrl, {
      headers: { Cookie: requestCookies },
    });
    const freshOppsData = await freshOppsRes.json();
    const freshList = freshOppsData[0]?.result?.data?.json?.opportunities || [];
    expect(freshList.length).toBeGreaterThan(0);
    const testOpp = freshList[0];
    console.log(`Selected test opportunity: ID=${testOpp.id}, BuildingID=${testOpp.buildingId}`);

    // 7. View dossier trpc query
    console.log(`Step 7: Viewing dossier for opportunity ID=${testOpp.id}...`);
    const dossierUrl = `${PROD_URL}/api/trpc/opportunity.getById?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { "json": { id: testOpp.id } } })
    )}`;

    const dossierRes = await fetch(dossierUrl, {
      headers: { Cookie: requestCookies },
    });

    const dossierData = await dossierRes.json();
    console.log("tRPC getById response status:", dossierRes.status, "Data:", JSON.stringify(dossierData).slice(0, 500));
    expect(dossierRes.status).toBe(200);
    const dossierResult = dossierData[0]?.result?.data?.json;
    expect(dossierResult.id).toBe(testOpp.id);

    // 8. Add a note to the opportunity
    console.log(`Step 8: Adding a note to opportunity ID=${testOpp.id}...`);
    const noteRes = await fetch(`${PROD_URL}/api/trpc/opportunity.addNote?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: requestCookies,
      },
      body: JSON.stringify({
        "0": {
          "json": {
            opportunityId: testOpp.id,
            body: "Smoke Test Note: verified rooftop has unobstructed sun exposure.",
          }
        }
      }),
    });

    const noteData = await noteRes.json();
    console.log("tRPC addNote response status:", noteRes.status, "Data:", noteData);
    expect(noteRes.status).toBe(200);

    // 9. Run a solar assessment
    console.log(`Step 9: Running a solar assessment for building ID=${testOpp.buildingId}...`);
    const assessRes = await fetch(`${PROD_URL}/api/trpc/assessment.run?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: requestCookies,
      },
      body: JSON.stringify({
        "0": {
          "json": {
            buildingId: testOpp.buildingId,
          }
        }
      }),
    });

    const assessData = await assessRes.json();
    console.log("tRPC assessment.run response status:", assessRes.status, "Data:", JSON.stringify(assessData).slice(0, 500));
    expect(assessRes.status).toBe(200);
    const assessResult = assessData[0]?.result?.data?.json;
    expect(assessResult.buildingId).toBe(testOpp.buildingId);
    console.log(`Assessment succeeded: systemSizeKwp=${assessResult.systemSizeKwp}, annualSavingsAed=${assessResult.annualSavingsAed}`);

    // Clean up test user and its related notes/evidence in DB
    console.log("Clean up: Deleting smoke test user from database...");
    await db.user.delete({ where: { email: email.toLowerCase() } });
    console.log("Smoke test completed successfully!");
  }, 100000); // 100s timeout
});
