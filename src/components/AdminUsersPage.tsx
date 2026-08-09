import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  LayoutGrid,
  LoaderCircle,
  LogIn,
  Users,
} from "lucide-react";
import { useAuth, type UserRole } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import {
  fetchAdminUsers,
  updateAdminUserRole,
  type AdminUserRow,
} from "@/admin/users";
import { useT } from "@/i18n/LocaleContext";

const ROLES: UserRole[] = ["member", "editor", "admin"];

function formatWhen(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminUsersPage() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminUsers();
        if (!cancelled) setUsers(data.users);
      } catch (err) {
        if (!cancelled) {
          setUsers([]);
          setError(
            err instanceof Error ? err.message : t("admin.users.error"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, t]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (row) =>
        row.email.toLowerCase().includes(q) ||
        (row.name?.toLowerCase().includes(q) ?? false) ||
        row.role.includes(q),
    );
  }, [users, query]);

  async function onRoleChange(userId: string, role: UserRole) {
    setSavingId(userId);
    setRoleError(null);
    try {
      const updated = await updateAdminUserRole(userId, role);
      setUsers((prev) =>
        prev.map((row) => (row.id === userId ? updated : row)),
      );
    } catch (err) {
      setRoleError(
        err instanceof Error ? err.message : t("admin.users.roleError"),
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm font-semibold text-tomato hover:underline"
          >
            {t("admin.back")}
          </Link>
          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink"
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
                {t("admin.users.toOverview")}
              </Link>
              <Link
                to="/admin/review"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream"
              >
                <ClipboardList className="size-4" aria-hidden="true" />
                {t("admin.users.toReview")}
              </Link>
            </div>
          ) : null}
        </div>

        <h1 className="mt-4 font-display text-5xl text-ink">
          {t("admin.users.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {t("admin.users.subtitle")}
        </p>

        {authLoading ? (
          <p
            className="mt-8 inline-flex items-center gap-2 text-ink-soft"
            role="status"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("admin.checkingAccess")}
          </p>
        ) : null}

        {!authLoading && !user ? (
          <div className="mt-8 rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
            <p className="text-ink-soft">{t("admin.signInPrompt")}</p>
            <button
              type="button"
              onClick={() => openAuth({ mode: "login" })}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-cream"
            >
              <LogIn className="size-4" aria-hidden="true" />
              {t("admin.signIn")}
            </button>
          </div>
        ) : null}

        {!authLoading && user && !isAdmin ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {t("admin.noAccess")}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {error}
          </p>
        ) : null}

        {roleError ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {roleError}
          </p>
        ) : null}

        {isAdmin ? (
          <div className="mt-8 space-y-4">
            <label className="block max-w-sm">
              <span className="text-sm font-medium text-ink-soft">
                {t("admin.users.search")}
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("admin.users.searchPlaceholder")}
                className="mt-1 min-h-11 w-full rounded-full border-2 border-ink/15 bg-cream px-4 text-ink"
              />
            </label>

            {loading ? (
              <p
                className="inline-flex items-center gap-2 text-ink-soft"
                role="status"
              >
                <LoaderCircle
                  className="size-5 animate-spin"
                  aria-hidden="true"
                />
                {t("admin.users.loading")}
              </p>
            ) : null}

            {!loading && rows.length === 0 ? (
              <p className="rounded-2xl bg-cream p-5 text-ink-soft ring-1 ring-ink/10">
                {t("admin.users.empty")}
              </p>
            ) : null}

            {!loading && rows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl bg-cream ring-1 ring-ink/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        {t("admin.users.col.user")}
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        {t("admin.users.col.joined")}
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        {t("admin.users.col.lastLogin")}
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        {t("admin.users.col.role")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSelf = row.id === user?.id;
                      const busy = savingId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="border-t border-ink/10 align-top"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <Users
                                className="mt-0.5 size-4 shrink-0 text-tomato"
                                aria-hidden="true"
                              />
                              <div>
                                <p className="font-semibold text-ink">
                                  <Link
                                    to={`/profile/${row.id}`}
                                    className="hover:text-tomato hover:underline"
                                  >
                                    {row.name?.trim() || t("admin.users.noName")}
                                  </Link>
                                  {isSelf ? (
                                    <span className="ml-2 text-xs font-medium text-ink-soft">
                                      {t("admin.users.you")}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-ink-soft">
                                  <Link
                                    to={`/profile/${row.id}`}
                                    className="hover:text-tomato hover:underline"
                                  >
                                    {row.email}
                                  </Link>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                            {formatWhen(row.createdAt, "—")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                            {formatWhen(
                              row.lastLoginAt,
                              t("admin.users.never"),
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={row.role}
                              disabled={busy}
                              aria-label={t("admin.users.roleAria", {
                                email: row.email,
                              })}
                              onChange={(event) => {
                                void onRoleChange(
                                  row.id,
                                  event.target.value as UserRole,
                                );
                              }}
                              className="min-h-10 rounded-full border-2 border-ink/15 bg-white px-3 text-ink disabled:opacity-60"
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {t(`admin.users.role.${role}`)}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
