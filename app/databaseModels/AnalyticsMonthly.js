import mongoose from "mongoose";

/*
 * Ek profile ka ek MAHINA = ek document. Ye kabhi delete nahi hota.
 * Daily / visitor documents bante hi nahi: din-wise data isi document ke
 * andar `days` map me jaata hai (max 31 din).
 *
 * people   = us mahine me kitne alag log aaye (cookie se, har insaan mahine me ek baar)
 * tappers  = us mahine me kitne alag logon ne kisi link par tap kiya
 * devices / countries / sources / links = { naam: count } maps
 * linkTitles = { linkKey: latest title }
 * days = { "YYYY-MM-DD": { visits, taps, people, tappers, devices, countries, sources, links } }
 */
const analyticsMonthlySchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },

    /* IST ka mahina, "YYYY-MM" */
    month: { type: String, required: true },

    visits: { type: Number, default: 0 },
    taps: { type: Number, default: 0 },
    people: { type: Number, default: 0 },
    tappers: { type: Number, default: 0 },

    devices: { type: mongoose.Schema.Types.Mixed, default: {} },
    countries: { type: mongoose.Schema.Types.Mixed, default: {} },
    sources: { type: mongoose.Schema.Types.Mixed, default: {} },
    links: { type: mongoose.Schema.Types.Mixed, default: {} },
    linkTitles: { type: mongoose.Schema.Types.Mixed, default: {} },

    days: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

/* upsert + dashboard range query dono isi se. TTL nahi: ye hamesha rahega. */
analyticsMonthlySchema.index({ profileId: 1, month: 1 }, { unique: true });

export default mongoose.models.AnalyticsMonthly ||
  mongoose.model("AnalyticsMonthly", analyticsMonthlySchema);