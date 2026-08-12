import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";

/* ---------------------------------------------------------
   ALBA-ANICIETE MEDICAL CLINIC — Online Appointment Booking
   Public website. No login. Submits into `patient_registrations`
   for clinic staff to review and approve inside the EMR.
--------------------------------------------------------- */

const CLINIC = {
  name: "ALBA-ANICIETE ADULT & PEDIA CLINIC",
  address: "2nd Floor R&M Bldg, JC Wagan St, Poblacion, San Antonio, Quezon, 4324",
  phone: "+639175605585",
  gcashNumber: "0949 801 2414 (Aaron Paul Aniciete)",
  // TODO: confirm this is the right Facebook page for THIS branch — carried over unchanged for now.
  facebookUrl: "https://www.facebook.com/albanicietemedicalclinic",
  // TODO: this needs a real Google Maps link for the San Antonio branch — placeholder for now.
  googleMapsUrl: "https://maps.google.com/?q=JC+Wagan+St+Poblacion+San+Antonio+Quezon",
};

// Doctor's weekly hours. Every day is open — Thursday just closes earlier.
const CLINIC_HOURS = {
  0: { open: "09:00", close: "15:30" }, // Sunday
  1: { open: "09:00", close: "15:30" }, // Monday
  2: { open: "09:00", close: "15:30" }, // Tuesday
  3: { open: "09:00", close: "15:30" }, // Wednesday
  4: { open: "09:00", close: "13:30" }, // Thursday
  5: { open: "09:00", close: "15:30" }, // Friday
  6: { open: "09:00", close: "15:30" }, // Saturday
};
const SLOT_MINUTES = 10;
const WALKIN_SLOTS = 5; // First 5 slots of each day are reserved for walk-ins, not bookable online.

function generateSlotsForDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const hours = CLINIC_HOURS[date.getDay()];
  if (!hours) return [];
  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const slots = [];
  let slotNumber = 1;
  for (let t = openMinutes; t + SLOT_MINUTES <= closeMinutes; t += SLOT_MINUTES) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const time24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ slotNumber, time: time24, isWalkIn: slotNumber <= WALKIN_SLOTS });
    slotNumber++;
  }
  return slots;
}

function formatTime12h(time24) {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/* ================================================================== */

export default function BookingApp() {
  const [step, setStep] = useState("landing"); // landing | form | confirmation
  const [confirmedInfo, setConfirmedInfo] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    supabase
      .from("app_state")
      .select("value")
      .eq("key", "schedule-notice")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error("loadNotice failed", error); return; }
        if (data && data.value && data.value.active && data.value.message) {
          setNotice(data.value.message);
        }
      });
  }, []);

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <header style={styles.header}>
        <img src="/logo-icon.png" alt="" style={{ width: 40, height: 40 }} />
        <div>
          <div style={styles.clinicName}>{CLINIC.name}</div>
          <div style={styles.clinicSub}>{CLINIC.address}</div>
        </div>
      </header>

      {notice && (
        <div style={styles.scheduleNotice}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>📣</span>
          <span>{notice}</span>
        </div>
      )}

      {step === "landing" && <Landing onStart={() => setStep("form")} />}
      {step === "form" && (
        <BookingForm
          onDone={(info) => {
            setConfirmedInfo(info);
            setStep("confirmation");
          }}
          onCancel={() => setStep("landing")}
        />
      )}
      {step === "confirmation" && <Confirmation info={confirmedInfo} onBackHome={() => setStep("landing")} />}

      <footer style={styles.footer}>
        Questions? Call or text the clinic at {CLINIC.phone}, or{" "}
        <a href={CLINIC.facebookUrl} target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
          message us on Facebook
        </a>.
      </footer>
    </div>
  );
}

function Landing({ onStart }) {
  return (
    <div style={styles.card}>
      <img src="/logo-full.png" alt={CLINIC.name} style={{ width: 200, display: "block", margin: "0 auto 18px" }} />
      <h1 style={styles.h1}>Book an appointment</h1>
      <p style={styles.p}>
        Fill in your details and pick a time — our team will confirm your booking after
        checking your payment.
      </p>

      <div style={styles.hoursBox}>
        <div style={styles.hoursTitle}>Clinic hours</div>
        <div style={styles.hoursRow}><span>Monday – Wednesday</span><span>9:00 AM – 3:30 PM</span></div>
        <div style={styles.hoursRow}><span>Thursday</span><span>9:00 AM – 1:30 PM</span></div>
        <div style={styles.hoursRow}><span>Friday – Sunday</span><span>9:00 AM – 3:30 PM</span></div>
      </div>

      <div style={styles.noteBox}>
        The first few slots each day are kept open for walk-ins. Online booking starts from the
        next available slot after that, in 10-minute increments.
      </div>

      <button style={styles.primaryBtn} onClick={onStart}>Book now</button>

      <div style={styles.locationBox}>
        {/* TODO: swap in a real photo or map screenshot of the San Antonio branch —
            removed for now rather than reuse the Tiaong branch's image by mistake. */}
        <div style={{ padding: "12px 14px" }}>
          <div style={styles.hoursTitle}>Find us</div>
          <div style={{ fontSize: 13, color: "#12312D", marginBottom: 10 }}>{CLINIC.address}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={CLINIC.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtn}>
              Open in Google Maps
            </a>
            <a href={CLINIC.facebookUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtnOutline}>
              View our updated clinic schedule
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingForm({ onDone, onCancel }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [guardian, setGuardian] = useState("");
  const [sex, setSex] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [allergies, setAllergies] = useState("");

  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [takenSlots, setTakenSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [gcashReference, setGcashReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const age = calcAge(dob);
  const isMinor = age !== null && age < 18;

  const loadTakenSlots = useCallback(async (dateStr) => {
    if (!dateStr) return;
    setLoadingSlots(true);
    setApptTime("");
    const { data, error } = await supabase
      .from("booked_slots_public")
      .select("appointment_time")
      .eq("appointment_date", dateStr);
    setLoadingSlots(false);
    if (error) {
      console.error("loadTakenSlots failed", error);
      setTakenSlots([]);
      return;
    }
    setTakenSlots((data || []).map((r) => r.appointment_time));
  }, []);

  useEffect(() => {
    if (apptDate) loadTakenSlots(apptDate);
  }, [apptDate, loadTakenSlots]);

  const daySlots = apptDate ? generateSlotsForDate(apptDate) : [];
  const bookableSlots = daySlots.filter((s) => !s.isWalkIn);
  const isDateOpenAtAll = apptDate ? daySlots.length > 0 : true;

  function validate() {
    // Only what's needed to actually hold the slot and follow up is required — everything
    // else (DOB, sex, guardian, address, allergies) can be filled in later if it's missing.
    if (!name.trim()) return "Please enter the patient's full name.";
    if (!contact.trim()) return "Please enter a contact number so we can reach you.";
    if (!apptDate) return "Please choose an appointment date.";
    if (!apptTime) return "Please choose an appointment time.";
    if (!gcashReference.trim()) return "Please enter your GCash payment reference number.";
    return "";
  }

  async function submit() {
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    const slot = daySlots.find((s) => s.time === apptTime);
    const { error } = await supabase.from("patient_registrations").insert({
      name: name.trim(),
      dob,
      guardian: guardian.trim(),
      sex,
      contact: contact.trim(),
      address: address.trim(),
      allergies: allergies.trim(),
      gcash_reference: gcashReference.trim(),
      appointment_date: apptDate,
      appointment_time: apptTime,
      slot_number: slot ? slot.slotNumber : null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      // Someone else likely took this slot in the last few seconds.
      setErrorMsg("That slot may have just been taken — please pick another time.");
      loadTakenSlots(apptDate);
      return;
    }
    onDone({ name: name.trim(), apptDate, apptTime });
  }

  return (
    <div style={styles.card}>
      <h1 style={styles.h1}>Patient & appointment details</h1>

      <SectionLabel>Patient information</SectionLabel>
      <Field label="Full name">
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Row>
        <Field label="Date of birth (optional)" style={{ flex: 1 }}>
          <input type="date" style={styles.input} value={dob} onChange={(e) => setDob(e.target.value)} max={todayIso()} />
        </Field>
        <Field label="Sex (optional)" style={{ flex: 1 }}>
          <select style={styles.input} value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </Field>
      </Row>
      {age !== null && (
        <div style={styles.hint}>{age} years old{isMinor ? " — a parent/guardian name below is helpful, if known" : ""}</div>
      )}
      {isMinor && (
        <Field label="Parent / guardian name (optional)">
          <input style={styles.input} value={guardian} onChange={(e) => setGuardian(e.target.value)} />
        </Field>
      )}
      <Field label="Contact number">
        <input style={styles.input} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="09XX XXX XXXX" />
      </Field>
      <Field label="Address (optional)">
        <input style={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Known allergies (optional)">
        <input style={styles.input} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="None known, or list allergen(s)" />
      </Field>

      <SectionLabel>Choose a time</SectionLabel>
      <Field label="Appointment date">
        <input type="date" style={styles.input} value={apptDate} min={todayIso()} onChange={(e) => setApptDate(e.target.value)} />
      </Field>

      {apptDate && !isDateOpenAtAll && (
        <div style={styles.hint}>The clinic isn't open that day — please pick another date.</div>
      )}

      {apptDate && isDateOpenAtAll && (
        <Field label="Available times">
          {loadingSlots ? (
            <div style={styles.hint}>Checking availability…</div>
          ) : (
            <div style={styles.slotGrid}>
              {bookableSlots.map((s) => {
                const isTaken = takenSlots.includes(s.time);
                const isSelected = apptTime === s.time;
                return (
                  <button
                    type="button"
                    key={s.time}
                    disabled={isTaken}
                    onClick={() => setApptTime(s.time)}
                    style={{
                      ...styles.slotBtn,
                      ...(isSelected ? styles.slotBtnSelected : {}),
                      ...(isTaken ? styles.slotBtnTaken : {}),
                    }}
                  >
                    {formatTime12h(s.time)}
                  </button>
                );
              })}
            </div>
          )}
          <div style={styles.hint}>
            Each slot is about 10 minutes. The clinic's first {WALKIN_SLOTS} slots each day are
            reserved for walk-ins and aren't shown here.
          </div>
        </Field>
      )}

      <SectionLabel>Payment</SectionLabel>
      <div style={styles.noteBox}>
        Scan the QR code below or send payment via GCash to <b>{CLINIC.gcashNumber}</b>, then
        enter the reference number from your GCash receipt. Your slot is confirmed once the
        clinic verifies it.
      </div>
      <img src="/gcash-qr.jpg" alt="GCash QR code for Alba-Aniciete Medical Clinic" style={styles.qrImage} />
      <Field label="GCash reference number">
        <input style={styles.input} value={gcashReference} onChange={(e) => setGcashReference(e.target.value)} placeholder="e.g. 1234567890123" />
      </Field>

      {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit booking"}
        </button>
        <button style={styles.secondaryBtn} onClick={onCancel} disabled={submitting}>Cancel</button>
      </div>
    </div>
  );
}

function Confirmation({ info, onBackHome }) {
  return (
    <div style={styles.card}>
      <h1 style={styles.h1}>Booking submitted</h1>
      {info && (
        <p style={styles.p}>
          Thanks, {info.name.split(" ")[0]} — we've received your request for{" "}
          <b>{new Date(info.apptDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</b>
          {" "}at <b>{formatTime12h(info.apptTime)}</b>.
        </p>
      )}
      <div style={styles.noteBox}>
        This isn't confirmed yet — our staff will verify your GCash payment and confirm your
        slot. If there's an issue, we'll contact you using the number you provided.
      </div>
      <button style={styles.primaryBtn} onClick={onBackHome}>Done</button>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={styles.sectionLabel}>{children}</div>;
}

function Row({ children }) {
  return <div style={{ display: "flex", gap: 10 }}>{children}</div>;
}

function Field({ label, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, ...style }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#F7F8F7", fontFamily: "Inter, system-ui, sans-serif", padding: "24px 16px 40px" },
  header: { display: "flex", alignItems: "center", gap: 12, maxWidth: 480, margin: "0 auto 20px" },
  clinicName: { fontFamily: "Fraunces, serif", fontSize: 16, color: "#12312D", lineHeight: 1.2 },
  clinicSub: { fontSize: 11.5, color: "#5B6B68" },
  scheduleNotice: { maxWidth: 480, margin: "0 auto 18px", background: "#0F5E56", borderRadius: 12, padding: "14px 18px", fontSize: 15.5, color: "#fff", lineHeight: 1.5, fontWeight: 700, boxShadow: "0 6px 20px rgba(15,94,86,0.35)", display: "flex", alignItems: "flex-start", gap: 10 },
  card: { maxWidth: 480, margin: "0 auto", background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E4EAE8", boxShadow: "0 8px 30px rgba(15,45,40,0.06)" },
  h1: { fontFamily: "Fraunces, serif", fontSize: 22, color: "#12312D", margin: "0 0 10px", textAlign: "center" },
  p: { fontSize: 14, color: "#2A3B38", lineHeight: 1.6, textAlign: "center" },
  hoursBox: { background: "#F7F8F7", borderRadius: 10, padding: "12px 14px", margin: "16px 0" },
  hoursTitle: { fontSize: 11.5, fontWeight: 700, color: "#5B6B68", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 },
  hoursRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#12312D", padding: "3px 0", fontFamily: "IBM Plex Mono, monospace" },
  noteBox: { background: "#FBF1DF", border: "1px solid #EAD6A8", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#6B4A1F", lineHeight: 1.5, margin: "12px 0" },
  errorBox: { background: "#FBE7E7", border: "1px solid #F0B4B4", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#B23B3B", marginTop: 12 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: "#0F5E56", textTransform: "uppercase", letterSpacing: 0.4, margin: "22px 0 10px", borderTop: "1px solid #EDF1F0", paddingTop: 18 },
  label: { fontSize: 11.5, color: "#5B6B68", fontWeight: 600 },
  input: { padding: "9px 11px", borderRadius: 8, border: "1px solid #DCE3E1", fontSize: 14, background: "#fff", color: "#12312D", outline: "none", width: "100%", boxSizing: "border-box" },
  hint: { fontSize: 11.5, color: "#8A9793", marginTop: 2 },
  primaryBtn: { background: "#0F5E56", color: "#fff", border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", width: "100%" },
  secondaryBtn: { background: "#fff", color: "#5B6B68", border: "1px solid #DCE3E1", borderRadius: 8, padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  slotGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  slotBtn: { padding: "8px 4px", borderRadius: 8, border: "1px solid #DCE3E1", background: "#fff", color: "#12312D", fontSize: 12.5, fontFamily: "IBM Plex Mono, monospace", cursor: "pointer" },
  slotBtnSelected: { background: "#0F5E56", borderColor: "#0F5E56", color: "#fff" },
  slotBtnTaken: { background: "#F1F4F3", color: "#B4BAB8", borderColor: "#E4EAE8", cursor: "not-allowed", textDecoration: "line-through" },
  footer: { textAlign: "center", fontSize: 12, color: "#8A9793", marginTop: 24 },
  footerLink: { color: "#0F5E56", fontWeight: 600, textDecoration: "none" },
  locationBox: { marginTop: 20, borderRadius: 10, overflow: "hidden", border: "1px solid #E4EAE8" },
  locationPhoto: { width: "100%", height: "auto", display: "block" },
  qrImage: { width: "100%", maxWidth: 260, display: "block", margin: "4px auto 16px", borderRadius: 10, border: "1px solid #E4EAE8" },
  linkBtn: { display: "inline-block", background: "#0F5E56", color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 7 },
  linkBtnOutline: { display: "inline-block", background: "#fff", color: "#0F5E56", textDecoration: "none", fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 7, border: "1px solid #0F5E56" },
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  input:focus, select:focus, button:focus-visible {
    outline: 2px solid #0F5E56; outline-offset: 1px;
  }
  button:disabled { opacity: 0.55; cursor: not-allowed; }
`;
