"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  preregisterVisitor,
  fetchUsers,
  fetchZones,
  type DashboardUser,
  type ZoneDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { ArrowLeft, Download, Printer, CheckCircle, X, Loader2 } from "lucide-react";

export default function PreRegistrationPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [hostUserId, setHostUserId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  // Data
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [zones, setZones] = useState<ZoneDto[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersResult, zonesResult] = await Promise.all([
          fetchUsers({ limit: 100 }),
          fetchZones(),
        ]);
        setUsers(usersResult.data);
        setZones(zonesResult);
      } catch {
        // Error handled silently
      }
    };
    loadData();
  }, []);

  const handleZoneToggle = (zoneId: string) => {
    setSelectedZones((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !hostUserId || !validFrom || !validUntil) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (new Date(validUntil) <= new Date(validFrom)) {
      setError("La date de fin doit être postérieure à la date de début");
      return;
    }

    setSubmitting(true);
    try {
      const result = await preregisterVisitor({
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        hostUserId,
        purpose: purpose || undefined,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
        zoneIds: selectedZones.length > 0 ? selectedZones : undefined,
      });

      setQrCode(result.qrCode);
      setSuccess(true);
      setShowQrModal(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCode) return;
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `badge-${firstName}-${lastName}.png`;
    link.click();
  };

  const handlePrintQr = () => {
    if (!qrCode) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Badge QR - ${firstName} ${lastName}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h2>${firstName} ${lastName}</h2>
            <img src="${qrCode}" style="width:300px;height:300px;" />
            <p>${company || ""}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setHostUserId("");
    setPurpose("");
    setValidFrom("");
    setValidUntil("");
    setSelectedZones([]);
    setSuccess(false);
    setQrCode("");
    setShowQrModal(false);
    setError("");
  };

  const selectedHostName = users.find((u) => u.id === hostUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("visitors.preregisterTitle")}</h1>
        <Button variant="outline" onClick={() => router.push("/visiteurs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visitor Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("visitors.visitorInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.firstName")} *
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.lastName")} *
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.email")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.phone")}
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.company")}
              </label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visit Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("visitors.visitDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.host")} *
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={hostUserId}
                onChange={(e) => setHostUserId(e.target.value)}
                required
              >
                <option value="">{t("common.select") || "Sélectionner..."}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.purpose")}
              </label>
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.validFrom")} *
              </label>
              <Input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("visitors.validUntil")} *
              </label>
              <Input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Zone Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("visitors.zoneRestrictions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {zones.length === 0 ? (
                <p className="col-span-full text-sm text-gray-500 dark:text-gray-400">
                  {t("common.noData")}
                </p>
              ) : (
                zones.map((zone) => (
                  <label
                    key={zone.id}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                      selectedZones.includes(zone.id)
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                        : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      checked={selectedZones.includes(zone.id)}
                      onChange={() => handleZoneToggle(zone.id)}
                    />
                    {zone.name}
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/visiteurs")}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("visitors.preregister")
            )}
          </Button>
        </div>
      </form>

      {/* QR Code Success Modal */}
      {showQrModal && qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowQrModal(false);
                router.push("/visiteurs");
              }}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                {t("visitors.success")}
              </h3>

              {/* QR Code */}
              <div className="my-6 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="QR Badge"
                  className="h-64 w-64 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                />
              </div>

              <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                {firstName} {lastName}
              </p>
              {company && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{company}</p>
              )}
              {selectedHostName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("visitors.host")}: {selectedHostName.firstName} {selectedHostName.lastName}
                </p>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadQr}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("visitors.downloadQr")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrintQr}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {t("visitors.printQr")}
                </Button>
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowQrModal(false);
                    handleReset();
                  }}
                >
                  {t("visitors.preregister")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowQrModal(false);
                    router.push("/visiteurs");
                  }}
                >
                  {t("common.back")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
