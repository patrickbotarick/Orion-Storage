export { buildDuplicateInput } from "./duplicate";
export {
  BoxCodeCapacityError,
  BoxNotFoundError,
  BoxProductImmutableError,
  BoxValidationError,
  DuplicateBoxCodeError,
  DuplicateInternalCodeError,
  DuplicateLocationError,
  DuplicateStorageAreaCodeError,
  InactiveProductBoxError,
  InactiveStorageAreaError,
  LocationCapacityError,
  LocationCapacityTooSmallError,
  LocationNotAssignableError,
  LocationNotFoundError,
  LocationStructureLockedError,
  LocationValidationError,
  ProductNotFoundError,
  ProductValidationError,
  StorageAreaNotFoundError,
  StorageAreaValidationError,
} from "./errors";
export type { FieldIssue } from "./errors";
export { filterProducts, listFilterOptions } from "./filter";
export type { ProductQuery, ProductStatusFilter } from "./filter";
export { suggestInternalCode } from "./internal-code";
export type { InternalCodeSource } from "./internal-code";
export {
  assertUniqueInternalCode,
  findDuplicateInternalCode,
  internalCodeKey,
} from "./internal-code-uniqueness";
export type { InternalCodeCarrier } from "./internal-code-uniqueness";
export { calculatedTotalLengthM, detectLengthDivergence, roundLengthM } from "./length";
export type { LengthDivergence, LengthDivergenceInput } from "./length";
export {
  normalizeDisplay,
  normalizeForComparison,
  normalizeInternalCode,
  toCodeToken,
} from "./normalize";
export { EMPTY_PRODUCT_FORM, PRODUCT_STATUSES } from "./product";
export type { Product, ProductFormValues, ProductInput, ProductStatus } from "./product";
export type { ProductRepository, StorageAreaRepository, LocationRepository } from "./repository";
export {
  assertValidProductInput,
  isProductStatus,
  parseOptionalDecimal,
  parseOptionalInteger,
  productInputSchema,
  productToFormValues,
  suggestInternalCodeFromForm,
  validateProductForm,
} from "./schema";
export type { FormValidation, ParsedMeasure } from "./schema";
export { demoProducts } from "./seeds";
export {
  BOX_HISTORY_TYPES,
  BOX_STATUSES,
  BOX_STATUS_LABEL,
  assertProductLinkUnchanged,
  isBoxStatus,
} from "./box";
export type {
  Box,
  BoxContentFields,
  BoxCreateInput,
  BoxHistoryEntry,
  BoxHistoryMetadata,
  BoxHistoryType,
  BoxStatus,
  BoxUpdateInput,
} from "./box";
export {
  BOX_CODE_PATTERN,
  BOX_CODE_TIME_ZONE,
  MAX_BOX_SEQUENCE,
  allocateBoxCode,
  assertBoxCodeAvailable,
  boxCodeDateKey,
  canonicalBoxCode,
  formatBoxCode,
  formatOperationalDate,
  parseBoxCode,
  sanitizeBoxCodeLedger,
} from "./box-code";
export type { BoxCodeLedger } from "./box-code";
export { mergeBoxContentSuggestion, suggestBoxContent } from "./box-content";
export type { BoxContentSource, BoxContentSuggestion } from "./box-content";
export { filterBoxes } from "./box-filter";
export type { BoxListItem, BoxPlacementFilter, BoxQuery, BoxStatusFilter } from "./box-filter";
export {
  buildCreatedHistory,
  buildLocationHistory,
  buildStatusHistory,
  buildUpdatedHistory,
  changedBoxFields,
} from "./box-history";
export type { BoxRepository } from "./box-repository";
export {
  assertValidBoxCreate,
  assertValidBoxUpdate,
  boxCreateSchema,
  boxToEditFormValues,
  boxUpdateSchema,
  emptyBoxForm,
  formatBoxFormNumber,
  isIsoDate,
  validateBoxCreateForm,
  validateBoxEditForm,
} from "./box-schema";
export type { BoxEditFormValues, BoxFormValidation, BoxFormValues } from "./box-schema";
export { demoBoxState } from "./box-seeds";
export { insertBox } from "./box-store";
export type { BoxPersistenceState } from "./box-store";
export {
  STORAGE_AREA_STATUSES,
  STORAGE_AREA_STATUS_LABEL,
  assertUniqueAreaCode,
  canonicalAreaCode,
  findAreaByCode,
  isStorageAreaStatus,
} from "./storage-area";
export type {
  StorageArea,
  StorageAreaCreateInput,
  StorageAreaStatus,
  StorageAreaUpdateInput,
} from "./storage-area";
export {
  LOCATION_STATUSES,
  LOCATION_STATUS_LABEL,
  addressIdentity,
  assertCapacityCoversOccupancy,
  assertLocationAssignable,
  assertLocationHasRoom,
  assertStructureEditable,
  assertUniqueLocation,
  buildLocationCode,
  canonicalAddressPart,
  canonicalStructure,
  countBoxesAtLocation,
  findLocationConflict,
  isLocationStatus,
  sameLocationStructure,
} from "./location";
export type { Location, LocationDraft, LocationStatus, LocationStructure } from "./location";
export { filterLocations, groupLocations } from "./location-filter";
export type { LocationListItem, LocationQuery, LocationStatusFilter, LocationTree } from "./location-filter";
export {
  assertValidAreaCreate,
  assertValidAreaUpdate,
  assertValidLocationForm,
  emptyAreaForm,
  emptyLocationForm,
  validateAreaCreateForm,
  validateAreaUpdateForm,
  validateLocationForm,
} from "./location-schema";
export type { LocationFormValidation, LocationFormValues, StorageAreaFormValidation, StorageAreaFormValues } from "./location-schema";
export { DEMO_AREA_ID, DEMO_LOCATION_IDS, demoLocations, demoStorageAreas } from "./location-seeds";
