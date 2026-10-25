import { supabase } from "./supabase";
import { toProvince } from "./provinces";

export type AppRole = "traveler" | "buddy" | "guide" | "admin";
export type ProviderStatus = "none" | "pending" | "approved" | "rejected";
export type TripType = "buddy" | "guide";
export type TripStatus = "draft" | "published" | "cancelled" | "completed";
export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
export type ReportTarget = "trip" | "review" | "profile";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type VerificationStatus = "unverified" | "pending" | "approved" | "rejected";
export type VerificationKind = "identity" | "buddy" | "guide";
export type VerificationRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type VerificationDocType = "national_id" | "passport" | "driver_license" | "tour_guide_license";

// is_suspended is intentionally not selectable by clients, so never use select("*") on profiles.
export const PROFILE_COLUMNS =
  "id, display_name, avatar_url, bio, interests, languages, service_area, role, requested_role, provider_status, identity_status, identity_verified_at, created_at, updated_at";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  interests: string[];
  languages: string[];
  service_area: string;
  role: AppRole;
  requested_role: AppRole | null;
  provider_status: ProviderStatus;
  identity_status: VerificationStatus;
  identity_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Organizer = Pick<Profile, "id" | "display_name" | "avatar_url" | "role" | "provider_status" | "service_area">;

export type TripRow = {
  id: string;
  organizer_id: string;
  type: TripType;
  title: string;
  description: string;
  /** Mirrors province for new trips; kept for older rows and bookings. */
  destination: string;
  province: string | null;
  area: string;
  /** Google Maps link to the meeting point; lat/lon are parsed from it by the database. */
  meeting_point_url: string | null;
  starts_at: string;
  ends_at: string | null;
  price_thb: number;
  capacity: number;
  seats_taken: number;
  image_url: string | null;
  lat: number | null;
  lon: number | null;
  status: TripStatus;
  is_sample: boolean;
  created_at: string;
  organizer?: Organizer | null;
};

// lat/lon are server-owned: the database derives them from meeting_point_url.
export type TripInput = Pick<TripRow, "type" | "title" | "description" | "destination" | "province" | "area" | "meeting_point_url" | "starts_at" | "ends_at" | "price_thb" | "capacity" | "image_url" | "status">;

export type ItineraryItem = { id?: string; trip_id?: string; position?: number; time_label: string; title: string; details: string };

export type Booking = {
  id: string;
  trip_id: string;
  traveler_id: string;
  party_size: number;
  unit_price_thb: number;
  total_price_thb: number;
  status: BookingStatus;
  note: string;
  created_at: string;
  updated_at: string;
  trip?: Pick<TripRow, "id" | "title" | "starts_at" | "status" | "organizer_id" | "destination"> | null;
  traveler?: Pick<Profile, "id" | "display_name"> | null;
};

export type BookingHistory = { id: number; booking_id: string; from_status: BookingStatus | null; to_status: BookingStatus; reason: string; created_at: string };

export type Review = { id: string; trip_id: string; reviewer_id: string; reviewer_name: string; rating: number; body: string; is_hidden: boolean; created_at: string };
export type TripRating = { trip_id: string; rating: number; review_count: number };
export type AppNotification = { id: string; kind: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };
export type PackageRow = { id: string; tag: string; title: string; english: string; meta: string; price_thb: number; image: string; alt: string; sort_order: number; is_published: boolean };
export type Report = { id: string; reporter_id: string; target_type: ReportTarget; target_id: string; reason: string; status: ReportStatus; resolution_note: string; resolved_at: string | null; created_at: string };
export type AuditLog = { id: number; actor_id: string | null; action: string; target_table: string; target_id: string | null; details: Record<string, unknown>; created_at: string };
export type VerificationRequest = {
  id: string; user_id: string; kind: VerificationKind; status: VerificationRequestStatus; legal_name: string;
  document_type: VerificationDocType; document_paths: string[]; note: string; reviewer_note: string; reviewed_at: string | null; created_at: string;
};
export type AdminVerification = VerificationRequest & { email: string; display_name: string; role: AppRole };
export type AdminUser = { id: string; email: string; display_name: string; role: AppRole; requested_role: AppRole | null; provider_status: ProviderStatus; is_suspended: boolean; service_area: string; created_at: string };

const TRIP_COLUMNS =
  "id, organizer_id, type, title, description, destination, province, area, meeting_point_url, starts_at, ends_at, price_thb, capacity, seats_taken, image_url, lat, lon, status, is_sample, created_at, organizer:profiles!trips_organizer_id_fkey(id, display_name, avatar_url, role, provider_status, service_area)";
const BOOKING_COLUMNS =
  "id, trip_id, traveler_id, party_size, unit_price_thb, total_price_thb, status, note, created_at, updated_at, trip:trips(id, title, starts_at, status, organizer_id, destination), traveler:profiles!bookings_traveler_id_fkey(id, display_name)";
const REVIEW_COLUMNS = "id, trip_id, reviewer_id, reviewer_name, rating, body, is_hidden, created_at";

export const roleLabel: Record<AppRole, string> = { traveler: "นักเดินทาง", buddy: "Buddy", guide: "ไกด์", admin: "ผู้ดูแลระบบ" };
export const tripStatusLabel: Record<TripStatus, string> = { draft: "ฉบับร่าง", published: "เปิดรับ", cancelled: "ยกเลิก", completed: "จบทริป" };
export const bookingStatusLabel: Record<BookingStatus, string> = { pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", rejected: "ปฏิเสธ", cancelled: "ยกเลิก", completed: "จบทริป" };
export const providerStatusLabel: Record<ProviderStatus, string> = { none: "—", pending: "รอพิจารณา", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ" };
// "ยืนยันตัวตนแล้ว" is shown only for approved, i.e. after an admin reviewed the documents.
export const verificationStatusLabel: Record<VerificationStatus, string> = { unverified: "ยังไม่ยืนยันตัวตน", pending: "รอตรวจสอบ", approved: "ยืนยันตัวตนแล้ว", rejected: "ไม่ผ่านการตรวจสอบ" };
export const verificationRequestStatusLabel: Record<VerificationRequestStatus, string> = { pending: "รอตรวจสอบ", approved: "อนุมัติ", rejected: "ไม่อนุมัติ", withdrawn: "ถอนคำขอแล้ว" };
export const verificationKindLabel: Record<VerificationKind, string> = { identity: "ยืนยันตัวตน (นักเดินทาง)", buddy: "สมัครเป็น Buddy", guide: "สมัครเป็นไกด์" };
export const verificationDocLabel: Record<VerificationDocType, string> = { national_id: "บัตรประชาชน", passport: "หนังสือเดินทาง", driver_license: "ใบขับขี่", tour_guide_license: "ใบอนุญาตมัคคุเทศก์" };

/** Turn a Supabase/PostgREST error into a Thai message the user can act on. */
export function thaiError(error: unknown): string {
  const err = (error ?? {}) as { message?: string; code?: string };
  const message = err.message ?? "";
  if (/[฀-๿]/.test(message)) return message;
  if (err.code === "42501" || /row-level security|permission denied/i.test(message)) return "คุณไม่มีสิทธิ์ทำรายการนี้";
  if (err.code === "23505") return "มีข้อมูลนี้อยู่แล้ว";
  if (err.code === "23514" || err.code === "22023" || err.code === "22P02") return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  if (/fetch|network/i.test(message)) return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง";
  return "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
}

function db() {
  if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  return supabase;
}

type Result<T> = PromiseLike<{ data: unknown; error: unknown }> & { __t?: T };

async function run<T>(query: Result<T>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(thaiError(error));
  return data as T;
}

// ---------- Trips ----------
export type TripSearch = { province?: string; type?: TripType; from?: string; to?: string; minSeats?: number; maxPrice?: number };

export async function searchTrips(filters: TripSearch) {
  let query = db().from("trips").select(TRIP_COLUMNS).eq("status", "published").gt("starts_at", new Date().toISOString()).order("starts_at");
  if (filters.province) query = query.eq("province", toProvince(filters.province) ?? filters.province);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.from) query = query.gte("starts_at", filters.from);
  if (filters.to) query = query.lt("starts_at", filters.to);
  if (filters.maxPrice) query = query.lte("price_thb", filters.maxPrice);
  const trips = await run<TripRow[]>(query.limit(100));
  return filters.minSeats ? trips.filter((trip) => trip.capacity - trip.seats_taken >= filters.minSeats!) : trips;
}

export const getTrip = (id: string) => run<TripRow | null>(db().from("trips").select(TRIP_COLUMNS).eq("id", id).maybeSingle());
export const myOrganizedTrips = (userId: string) =>
  run<TripRow[]>(db().from("trips").select(TRIP_COLUMNS).eq("organizer_id", userId).order("starts_at", { ascending: false }));
export const createTrip = (organizerId: string, input: TripInput) =>
  run<TripRow>(db().from("trips").insert({ ...input, organizer_id: organizerId }).select(TRIP_COLUMNS).single());
export const updateTrip = (id: string, input: Partial<TripInput>) =>
  run<TripRow>(db().from("trips").update(input).eq("id", id).select(TRIP_COLUMNS).single());
export const deleteTrip = (id: string) => run<null>(db().from("trips").delete().eq("id", id));

export const getItinerary = (tripId: string) =>
  run<ItineraryItem[]>(db().from("itinerary_items").select("id, trip_id, position, time_label, title, details").eq("trip_id", tripId).order("position"));
export const saveItinerary = (tripId: string, items: ItineraryItem[]) =>
  run<ItineraryItem[]>(db().rpc("save_itinerary", { p_trip_id: tripId, p_items: items.map(({ time_label, title, details }) => ({ time_label, title, details })) }));

export async function tripRatings(ids: string[]) {
  if (!ids.length) return new Map<string, TripRating>();
  const rows = await run<TripRating[]>(db().from("trip_ratings").select("trip_id, rating, review_count").in("trip_id", ids));
  return new Map(rows.map((row) => [row.trip_id, row]));
}

// ---------- Bookings ----------
export const createBooking = (tripId: string, partySize: number, note = "") =>
  run<Booking>(db().rpc("create_booking", { p_trip_id: tripId, p_party_size: partySize, p_note: note }));
export const setBookingStatus = (bookingId: string, status: BookingStatus, reason = "") =>
  run<Booking>(db().rpc("set_booking_status", { p_booking_id: bookingId, p_status: status, p_reason: reason }));
export const myBookings = (userId: string) =>
  run<Booking[]>(db().from("bookings").select(BOOKING_COLUMNS).eq("traveler_id", userId).order("created_at", { ascending: false }));
export const bookingsForTrips = (tripIds: string[]) =>
  tripIds.length
    ? run<Booking[]>(db().from("bookings").select(BOOKING_COLUMNS).in("trip_id", tripIds).order("created_at", { ascending: false }))
    : Promise.resolve([] as Booking[]);
export const allBookings = () => run<Booking[]>(db().from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(200));
export const bookingHistory = (bookingId: string) =>
  run<BookingHistory[]>(db().from("booking_status_history").select("id, booking_id, from_status, to_status, reason, created_at").eq("booking_id", bookingId).order("created_at"));

// ---------- Reviews ----------
export const tripReviews = (tripId: string) =>
  run<Review[]>(db().from("reviews").select(REVIEW_COLUMNS).eq("trip_id", tripId).order("created_at", { ascending: false }));
export const allReviews = () => run<Review[]>(db().from("reviews").select(REVIEW_COLUMNS).order("created_at", { ascending: false }).limit(200));
export const myReviews = (userId: string) => run<Review[]>(db().from("reviews").select(REVIEW_COLUMNS).eq("reviewer_id", userId));
export const submitReview = (userId: string, tripId: string, rating: number, body: string) =>
  run<Review>(db().from("reviews").insert({ trip_id: tripId, reviewer_id: userId, rating, body }).select(REVIEW_COLUMNS).single());

// ---------- Favorites ----------
export async function myFavoriteIds(userId: string) {
  const rows = await run<{ trip_id: string }[]>(db().from("favorites").select("trip_id").eq("user_id", userId));
  return rows.map((row) => row.trip_id);
}
export const addFavorite = (userId: string, tripId: string) => run<null>(db().from("favorites").insert({ user_id: userId, trip_id: tripId }));
export const removeFavorite = (userId: string, tripId: string) =>
  run<null>(db().from("favorites").delete().eq("user_id", userId).eq("trip_id", tripId));

// ---------- Profile & notifications ----------
export type ProfileInput = Partial<Pick<Profile, "display_name" | "avatar_url" | "bio" | "interests" | "languages" | "service_area">>;
export const updateProfile = (userId: string, input: ProfileInput) =>
  run<Profile>(db().from("profiles").update(input).eq("id", userId).select(PROFILE_COLUMNS).single());
export const myNotifications = () =>
  run<AppNotification[]>(db().from("notifications").select("id, kind, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(50));
export const markNotificationsRead = () => run<null>(db().rpc("mark_notifications_read"));

// ---------- Reports ----------
export const submitReport = (userId: string, targetType: ReportTarget, targetId: string, reason: string) =>
  run<null>(db().from("reports").insert({ reporter_id: userId, target_type: targetType, target_id: targetId, reason }));

// ---------- Storage ----------
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Uploads into <bucket>/<uid>/..., the only folder Storage policies allow. Bucket limits are enforced server-side too. */
export async function uploadImage(bucket: "avatars" | "trip-images", userId: string, file: File) {
  const limit = bucket === "avatars" ? 2 : 5;
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
  if (file.size > limit * 1024 * 1024) throw new Error(`ไฟล์ต้องมีขนาดไม่เกิน ${limit} MB`);
  const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error } = await db().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(thaiError(error));
  return db().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// ---------- Identity verification (private bucket; files are deleted after the decision) ----------
const VERIFICATION_BUCKET = "verification-docs";
export const VERIFICATION_TYPES = [...IMAGE_TYPES, "application/pdf"];
const VERIFICATION_COLUMNS = "id, user_id, kind, status, legal_name, document_type, document_paths, note, reviewer_note, reviewed_at, created_at";

export async function uploadVerificationDoc(userId: string, file: File) {
  if (!VERIFICATION_TYPES.includes(file.type)) throw new Error("รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF");
  if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
  const ext = file.type === "application/pdf" ? "pdf" : EXTENSIONS[file.type];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(VERIFICATION_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(thaiError(error));
  return path;
}

/** Best effort: Storage refuses while a file is still attached to a pending request. */
export async function removeVerificationDocs(paths: string[]) {
  if (!paths.length) return;
  const { error } = await db().storage.from(VERIFICATION_BUCKET).remove(paths);
  if (error) throw new Error(thaiError(error));
}

/** Short-lived link; admins get one only while the request is pending. */
export async function verificationDocUrl(path: string) {
  const { data, error } = await db().storage.from(VERIFICATION_BUCKET).createSignedUrl(path, 60);
  if (error || !data) throw new Error(thaiError(error));
  return data.signedUrl;
}

export const myVerifications = () =>
  run<VerificationRequest[]>(db().from("verification_requests").select(VERIFICATION_COLUMNS).order("created_at", { ascending: false }));
export type VerificationInput = { kind: VerificationKind; legalName: string; documentType: VerificationDocType; paths: string[]; note: string };
export const submitVerification = (input: VerificationInput) =>
  run<VerificationRequest>(db().rpc("submit_verification", {
    p_kind: input.kind, p_legal_name: input.legalName, p_document_type: input.documentType, p_document_paths: input.paths, p_note: input.note,
  }));
export const withdrawVerification = (id: string) => run<string[]>(db().rpc("withdraw_verification", { p_id: id }));

// ---------- Packages ----------
const PACKAGE_COLUMNS = "id, tag, title, english, meta, price_thb, image, alt, sort_order, is_published";
export const listPackages = () => run<PackageRow[]>(db().from("packages").select(PACKAGE_COLUMNS).order("sort_order"));
export const updatePackage = (id: string, input: Partial<Omit<PackageRow, "id">>) =>
  run<PackageRow>(db().from("packages").update(input).eq("id", id).select(PACKAGE_COLUMNS).single());

// ---------- Admin (every call is re-checked and audited inside the database) ----------
export const adminListUsers = (search: string) => run<AdminUser[]>(db().rpc("admin_list_users", { p_search: search, p_limit: 100 }));
export const adminSetRole = (userId: string, role: AppRole, reason: string) =>
  run<Profile>(db().rpc("admin_set_role", { p_user: userId, p_role: role, p_reason: reason }));
export const adminListVerifications = (status: VerificationRequestStatus | null) =>
  run<AdminVerification[]>(db().rpc("admin_list_verifications", { p_status: status }));
/** Returns the request's file paths so the caller can delete them from Storage. */
export const adminReviewVerification = (id: string, approve: boolean, reason: string) =>
  run<string[]>(db().rpc("admin_review_verification", { p_id: id, p_approve: approve, p_reason: reason }));
export const adminSetSuspended = (userId: string, suspended: boolean, reason: string) =>
  run<Profile>(db().rpc("admin_set_suspended", { p_user: userId, p_suspended: suspended, p_reason: reason }));
export const adminSetTripStatus = (tripId: string, status: TripStatus, reason: string) =>
  run<TripRow>(db().rpc("admin_set_trip_status", { p_trip: tripId, p_status: status, p_reason: reason }));
export const adminSetReviewHidden = (reviewId: string, hidden: boolean, reason: string) =>
  run<Review>(db().rpc("admin_set_review_hidden", { p_review: reviewId, p_hidden: hidden, p_reason: reason }));
export const adminResolveReport = (reportId: string, status: ReportStatus, note: string) =>
  run<Report>(db().rpc("admin_resolve_report", { p_report: reportId, p_status: status, p_note: note }));
export const adminTrips = () => run<TripRow[]>(db().from("trips").select(TRIP_COLUMNS).order("created_at", { ascending: false }).limit(200));
export const adminReports = () =>
  run<Report[]>(db().from("reports").select("id, reporter_id, target_type, target_id, reason, status, resolution_note, resolved_at, created_at").order("created_at", { ascending: false }).limit(200));
export const adminAuditLogs = () =>
  run<AuditLog[]>(db().from("audit_logs").select("id, actor_id, action, target_table, target_id, details, created_at").order("created_at", { ascending: false }).limit(200));

// ---------- Formatting ----------
export const formatTHB = (value: number) => `฿${value.toLocaleString("th-TH")}`;
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
