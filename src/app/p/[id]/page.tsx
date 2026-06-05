import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getEmirateConfig } from "@/lib/regulatory/emirates";
import { calculateAllFinancingModels } from "@/lib/engine/financing";
import { Solar3DViewer } from "@/components/viewer/Solar3DViewer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const proposal = await db.proposal.findUnique({ where: { id }, include: { building: true, assessment: true } });
  if (!proposal?.building) return { title: "Solar Proposal - SolarZero" };
  return {
    title: `Solar Proposal - ${proposal.building.address}`,
    description: `Solar assessment for ${proposal.building.address} — ${proposal.assessment ? `${proposal.assessment.systemSizeKwp.toFixed(1)} kWp` : "View details"}`,
    openGraph: { title: `Solar Proposal - ${proposal.building.address}`, description: `${proposal.assessment?.systemSizeKwp.toFixed(1)} kWp solar system` },
  };
}

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const proposal = await db.proposal.findUnique({
    where: { id },
    include: { assessment: true, building: true },
  });

  if (!proposal || !proposal.assessment || !proposal.building) notFound();

  const { building, assessment } = proposal;
  const emirate = getEmirateConfig(building.lat, building.lng);

  const financingModels = calculateAllFinancingModels({
    totalCostAed: assessment.totalCostAed,
    annualProductionKwh: assessment.annualProduction,
    annualSavingsAed: assessment.annualSavingsAed,
    paybackYears: assessment.paybackYears,
    npv25yrAed: assessment.npv25yrAed,
    co2OffsetTons: assessment.co2OffsetTons,
    dewaTariffAed: assessment.dewaTariffAed,
  });

  const treesEquivalent = Math.round(assessment.co2OffsetTons * 46);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500 text-xs font-bold text-white">SZ</div>
            <div>
              <h2 className="text-sm font-semibold">SolarZero</h2>
              <p className="text-xs text-muted-foreground">Powered by Positive Zero</p>
            </div>
          </div>
          <a href={`mailto:sales@positivezero.ae?subject=Solar Proposal: ${building.address}`} className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600">Schedule a Call</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{building.address}</h1>
            <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700 border border-blue-300">{emirate.name} · {emirate.utility}</span>
          </div>
          <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
            <span>System: {assessment.systemSizeKwp.toFixed(1)} kWp</span>
            <span>·</span>
            <span>{assessment.panelCount} panels</span>
            <span>·</span>
            <span>{Math.round(assessment.annualProduction).toLocaleString()} kWh/yr</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>3D Solar Visualization</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[350px] rounded-lg border"><Solar3DViewer buildingType={building.buildingType ?? "commercial"} roofAreaM2={building.roofAreaM2 ?? 100} heightMeters={building.heightMeters ?? 12} panelCount={assessment.panelCount} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Solar Assessment</CardTitle><CardDescription>Data source: {assessment.dataSource} | GHI: {Math.round(assessment.ghiAnnual)} kWh/m²/yr</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[{l:"System Size",v:`${assessment.systemSizeKwp.toFixed(1)} kWp`},{l:"Annual Production",v:`${Math.round(assessment.annualProduction).toLocaleString()} kWh`},{l:"Total Cost",v:`AED ${Math.round(assessment.totalCostAed).toLocaleString()}`},{l:"Annual Savings",v:`AED ${Math.round(assessment.annualSavingsAed).toLocaleString()}`},{l:"Payback",v:`${assessment.paybackYears.toFixed(1)} years`},{l:"25yr NPV",v:`AED ${Math.round(assessment.npv25yrAed).toLocaleString()}`},{l:"CO₂ Offset",v:`${assessment.co2OffsetTons.toFixed(1)} tons/yr`},{l:"Tariff",v:`${assessment.dewaTariffAed.toFixed(2)} AED/kWh`}].map(m=>(<div key={m.l} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{m.l}</div><div className="text-sm font-semibold">{m.v}</div></div>))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financing Options</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {financingModels.map((m) => (
                    <div key={m.type} className={`rounded-lg border p-3 ${m.type==="DIRECT"?"border-red-200 bg-red-50/50":m.type==="PPA"?"border-green-200 bg-green-50/50":m.type==="LEASE"?"border-blue-200 bg-blue-50/50":"border-purple-200 bg-purple-50/50"}`}>
                      <div className="flex items-center justify-between mb-1"><h3 className="text-sm font-semibold">{m.name}</h3>{m.recommended&&<span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">Recommended</span>}</div>
                      <div className="space-y-0.5 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Upfront</span><span className="font-medium">AED {m.upfrontCostAED.toLocaleString()}</span></div>{m.monthlyPaymentAED>0&&<div className="flex justify-between"><span className="text-muted-foreground">Monthly</span><span className="font-medium">AED {m.monthlyPaymentAED.toLocaleString()}</span></div>}<div className="flex justify-between"><span className="text-muted-foreground">Annual Savings</span><span className="font-medium">AED {m.annualSavingsAED.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-muted-foreground">25yr NPV</span><span className="font-medium">AED {m.npv25yrAED.toLocaleString()}</span></div></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Environmental Impact</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{assessment.co2OffsetTons.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">tons CO₂ offset per year</p>
                <p className="mt-2 text-sm">Equivalent to planting <strong>{treesEquivalent.toLocaleString()}</strong> trees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Building Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{building.buildingType ?? "Unknown"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Roof Area</span><span className="font-medium">{building.roofAreaM2 ? `${Math.round(building.roofAreaM2)} m²` : "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Emirate</span><span className="font-medium">{emirate.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Utility</span><span className="font-medium">{emirate.utility}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <a href={`mailto:sales@positivezero.ae?subject=Solar Proposal: ${building.address}`} className="block w-full rounded-md bg-yellow-500 py-3 text-center text-sm font-medium text-white hover:bg-yellow-600">Schedule a Call</a>
                <p className="mt-3 text-center text-xs text-muted-foreground">Ready to go solar? Our team will walk you through the proposal.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
