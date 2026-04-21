import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { Building2, FileText, MapPin, Upload, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/lib/supabase";
import { compactInr } from "@/lib/format";
import type { Property, PropertyDoc, KycStatus } from "@/lib/database.types";

// Fix default leaflet marker icons (Vite path issues)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props { customerId: string }

async function fetchProperties(customerId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("customer_id", customerId)
    .order("market_value", { ascending: false });
  if (error) throw error;
  const ids = (data ?? []).map((p: any) => p.id);
  const docs = ids.length
    ? (await supabase.from("property_docs").select("*").in("property_id", ids)).data ?? []
    : [];
  return (data ?? []).map((p: any) => ({
    ...p,
    docs: docs.filter((d: any) => d.property_id === p.id) as PropertyDoc[],
  })) as (Property & { docs: PropertyDoc[] })[];
}

export function PropertyCanvas({ customerId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["properties", customerId],
    queryFn: () => fetchProperties(customerId),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data && data.length && !selectedId) setSelectedId(data[0].id);
  }, [data, selectedId]);

  async function uploadPropertyDoc(propertyId: string, file: File) {
    setUploading(true);
    try {
      const docType = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Document";
      const path = `${customerId}/${propertyId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("property-docs")
        .upload(path, file, { upsert: true });
      if (upErr) {
        toast.error("Upload failed", { description: upErr.message });
        return;
      }
      const { data: signed } = await supabase.storage
        .from("property-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const sb: any = supabase;
      const { error } = await sb.from("property_docs").insert({
        property_id: propertyId,
        doc_type: docType,
        file_url: signed?.signedUrl ?? path,
        uploaded_at: new Date().toISOString(),
        status: "uploaded" as KycStatus,
      });
      if (error) {
        toast.error("Save failed", { description: error.message });
        return;
      }
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["properties", customerId] });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) return <Skeleton className="h-[480px] rounded-lg" />;
  if (!data || data.length === 0)
    return <EmptyState icon={Building2} title="No properties" description="Add a property to see it on the map." />;

  const selected = data.find((p) => p.id === selectedId) ?? data[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
      {/* Property list */}
      <div className="space-y-2">
        {data.map((p) => {
          const active = p.id === selected.id;
          return (
            <Card
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`cursor-pointer border-border bg-surface-1 transition-all hover:border-primary/40 ${active ? "border-primary/60 shadow-elegant" : ""}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />{p.address}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{p.property_type}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{p.area_sqft ? `${p.area_sqft} sqft` : "—"}</span>
                  <span className="tabular font-medium text-success">{compactInr(p.market_value)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Map + docs (40/60-ish) */}
      <div className="space-y-3">
        <Card className="overflow-hidden border-border bg-surface-1">
          <div className="h-72 w-full">
            <MapContainer
              key={selected.id} // force remount on selection change
              center={[selected.latitude, selected.longitude]}
              zoom={14}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[selected.latitude, selected.longitude]} icon={icon}>
                <Popup>
                  <strong>{selected.title}</strong>
                  <br />
                  {selected.address}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardHeader className="flex-row items-center justify-between gap-2 py-3">
            <CardTitle className="text-sm">Property documents</CardTitle>
            <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border px-2 text-[11px] hover:bg-surface-2">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPropertyDoc(selected.id, f);
                  e.target.value = "";
                }}
              />
            </label>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {selected.docs.length === 0 ? (
              <p className="col-span-full text-xs text-muted-foreground">No documents uploaded.</p>
            ) : (
              selected.docs.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-md border border-border bg-surface-2/40 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">{d.doc_type}</p>
                    <p className="text-[10px] capitalize text-muted-foreground">{d.status}</p>
                  </div>
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Open document"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
