type BuildingLike = {
  name?: string | null;
  address?: string | null;
};

export function getBuildingDisplayName(building: BuildingLike | null | undefined): string {
  if (!building) return "Building";

  const name = building.name?.trim();
  if (name) return name;

  return "Unnamed building";
}

export function getBuildingDisplaySubtitle(building: BuildingLike | null | undefined): string | null {
  if (!building) return null;

  const name = building.name?.trim();
  const address = building.address?.trim();

  if (address && (!name || name !== address)) {
    return address;
  }

  return null;
}
