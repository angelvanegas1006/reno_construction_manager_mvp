"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "inactive";
};

const DATA: User[] = [
  { id: 1, name: "Angel Vanegas", email: "angel@example.com", role: "admin", status: "active" },
  { id: 2, name: "Sara Parker", email: "sara@example.com", role: "editor", status: "active" },
  { id: 3, name: "John Smith", email: "john@example.com", role: "viewer", status: "inactive" },
  { id: 4, name: "María López", email: "maria@example.com", role: "editor", status: "active" },
  { id: 5, name: "Ken Adams", email: "ken@example.com", role: "viewer", status: "inactive" },
];

export default function DemoTable() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(true);

  const rows = useMemo(() => {
    let items = [...DATA];
    if (role !== "all") items = items.filter((r) => r.role === role);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((r) =>
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return items;
  }, [query, role, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por nombre o email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortAsc((v) => !v)}>
          Orden: {sortAsc ? "A→Z" : "Z→A"}
        </Button>
        <Button
          onClick={() => toast("Acción ejecutada", { description: "Ejemplo de notificación" })}
        >
          Mostrar toast
        </Button>
      </div>

      <Table>
        <TableCaption>Usuarios de ejemplo</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell className="capitalize">{r.role}</TableCell>
              <TableCell className={r.status === "active" ? "text-[var(--prophero-success)]" : "text-[var(--prophero-gray-500)]"}>
                {r.status}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}





