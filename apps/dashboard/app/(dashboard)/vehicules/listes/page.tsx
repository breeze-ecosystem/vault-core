"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchVehicleList,
  createVehicleListEntry,
  updateVehicleListEntry,
  deleteVehicleListEntry,
  type VehicleListEntryDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { Plus, Edit3, Trash2, Search, X, Check } from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function VehicleListsPage() {
  const { t } = useTranslation();

  const [listType, setListType] = useState<"allowlist" | "blocklist">("allowlist");
  const [entries, setEntries] = useState<VehicleListEntryDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addError, setAddError] = useState("");

  // Edit modal state
  const [editEntry, setEditEntry] = useState<VehicleListEntryDto | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete confirm
  const [deleteEntry, setDeleteEntry] = useState<VehicleListEntryDto | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVehicleList(listType);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [listType]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = entries.filter((e) =>
    e.plate.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAdd = async () => {
    if (!newPlate.trim()) {
      setAddError("La plaque est requise");
      return;
    }
    setActionLoading("add");
    try {
      await createVehicleListEntry({
        type: listType,
        plate: newPlate.trim().toUpperCase(),
        siteId: "00000000-0000-0000-0000-000000000000", // Will be overridden by server
        description: newDescription || undefined,
      });
      setShowAddModal(false);
      setNewPlate("");
      setNewDescription("");
      setAddError("");
      await loadEntries();
    } catch (err: any) {
      setAddError(err.message || "Erreur lors de l'ajout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async () => {
    if (!editEntry) return;
    setActionLoading("edit");
    try {
      await updateVehicleListEntry(editEntry.id, {
        description: editDescription || undefined,
        isActive: editIsActive,
      });
      setEditEntry(null);
      await loadEntries();
    } catch (err: any) {
      console.error("Edit failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setActionLoading("delete");
    try {
      await deleteVehicleListEntry(deleteEntry.id);
      setDeleteEntry(null);
      await loadEntries();
    } catch (err: any) {
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("vehicles.title")}</h1>
      </div>

      {/* Toggle: Allowlist / Blocklist */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            listType === "allowlist"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
          onClick={() => setListType("allowlist")}
        >
          {t("vehicles.lists.allowlist")}
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            listType === "blocklist"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
          onClick={() => setListType("blocklist")}
        >
          {t("vehicles.lists.blocklist")}
        </button>
      </div>

      {/* Search & Add */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t("vehicles.lists.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("vehicles.lists.add")}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                {t("vehicles.lists.plate")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                {t("vehicles.lists.description")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                {t("vehicles.lists.status")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                {t("access.createdAt")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                {t("common.actions") || "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {t("common.loading")}
                </td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {t("vehicles.lists.noEntries")}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold">{entry.plate}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {entry.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={entry.isActive ? "success" : "secondary"}>
                      {entry.isActive ? t("access.active") : t("access.inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditEntry(entry);
                          setEditDescription(entry.description || "");
                          setEditIsActive(entry.isActive);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteEntry(entry)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4">
              {listType === "allowlist"
                ? t("vehicles.lists.addToAllowlist")
                : t("vehicles.lists.addToBlocklist")}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("vehicles.lists.plate")}
                </label>
                <Input
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("vehicles.lists.description")}
                </label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description optionnelle"
                />
              </div>
              {addError && (
                <p className="text-sm text-red-500">{addError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setAddError("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAdd} disabled={actionLoading === "add"}>
                {actionLoading === "add" ? t("common.loading") : t("vehicles.lists.add")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4">
              {t("vehicles.lists.edit")} — {editEntry.plate}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("vehicles.lists.description")}
                </label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t("vehicles.lists.status")}:</label>
                <button
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    editIsActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                  onClick={() => setEditIsActive(!editIsActive)}
                >
                  {editIsActive ? t("access.active") : t("access.inactive")}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditEntry(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleEdit} disabled={actionLoading === "edit"}>
                {actionLoading === "edit" ? t("common.loading") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-2">
              {t("common.confirm")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {`Supprimer ${deleteEntry.plate} de la liste ?`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteEntry(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={actionLoading === "delete"}
              >
                {actionLoading === "delete" ? t("common.loading") : t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
