import { db } from "@/lib/db";

export class EnrichmentService {
  /**
   * Manually adds company occupier details and contact details to an opportunity.
   */
  static async addManualEnrichment(data: {
    opportunityId: string;
    companyName: string;
    relationship?: string;
    source: string;
    confidence?: number;
    contact?: {
      name?: string;
      role?: string;
      email?: string;
      phone?: string;
      sourcePolicy?: string;
    };
  }) {
    const result = await db.$transaction(async (tx) => {
      // 1. Create company signal
      const company = await tx.companySignal.create({
        data: {
          opportunityId: data.opportunityId,
          companyName: data.companyName,
          relationship: data.relationship ?? "occupant",
          source: data.source,
          confidence: data.confidence ?? 1.0,
          observedAt: new Date(),
        },
      });

      // 2. Create contact signal if provided
      let contact = null;
      if (data.contact) {
        contact = await tx.contactSignal.create({
          data: {
            opportunityId: data.opportunityId,
            companySignalId: company.id,
            name: data.contact.name ?? null,
            role: data.contact.role ?? null,
            email: data.contact.email ?? null,
            phone: data.contact.phone ?? null,
            source: data.source,
            sourcePolicy: data.contact.sourcePolicy ?? "opt_in",
            confidence: data.confidence ?? 1.0,
          },
        });
      }

      return { company, contact };
    });

    // Re-trigger scoring & ranking OUTSIDE the transaction since signals changed!
    try {
      const opportunity = await db.opportunity.findUnique({
        where: { id: data.opportunityId },
      });
      if (opportunity) {
        const { OpportunityService } = await import("./opportunity");
        await OpportunityService.ensureOpportunityForBuilding(opportunity.buildingId);
        const { RankingService } = await import("./ranking");
        await RankingService.generateRankSnapshots();
      }
    } catch (err) {
      console.error("Failed to rescore after manual enrichment:", err);
    }

    return result;
  }

  /**
   * Imports contacts from raw CSV text. Matches rows to opportunities by address matching or OSM ID.
   * Expected headers: osmId, address, companyName, name, role, email, phone
   */
  static async importContactsFromCsv(csvText: string) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV has no data rows");
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });

    let importedCount = 0;

    for (const row of rows) {
      const osmId = row.osmId;
      const address = row.address;
      const companyName = row.companyName || row.company;
      const name = row.name || row.contactName;
      const role = row.role || row.contactRole;
      const email = row.email || row.contactEmail;
      const phone = row.phone || row.contactPhone;

      if (!companyName) continue;

      let opportunity = null;
      if (osmId) {
        opportunity = await db.opportunity.findFirst({
          where: { building: { osmId } },
        });
      }

      if (!opportunity && address) {
        opportunity = await db.opportunity.findFirst({
          where: {
            building: {
              address: {
                contains: address,
                mode: "insensitive",
              },
            },
          },
        });
      }

      if (opportunity) {
        await this.addManualEnrichment({
          opportunityId: opportunity.id,
          companyName,
          relationship: "occupant",
          source: "csv_import",
          confidence: 0.8,
          contact: name || email || phone ? {
            name,
            role,
            email,
            phone,
            sourcePolicy: "csv_imported",
          } : undefined,
        });
        importedCount++;
      }
    }

    return { success: true, importedCount };
  }
}
