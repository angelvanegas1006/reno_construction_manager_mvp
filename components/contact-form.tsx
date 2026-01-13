"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const ContactSchema = z.object({
  name: z.string().min(2, { message: "Nombre muy corto" }).max(50),
  email: z.string().email({ message: "Email inválido" }),
});

type ContactValues = z.infer<typeof ContactSchema>;

export default function ContactForm() {
  const [submitted, setSubmitted] = useState<ContactValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { name: "", email: "" },
  });

  function onSubmit(values: ContactValues) {
    setSubmitted(values);
    reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacto</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Nombre
            </label>
            <Input id="name" placeholder="Tu nombre" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input id="email" placeholder="tu@correo.com" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </form>
        {submitted && (
          <div className="mt-4 rounded-md border p-3 text-sm">
            <div className="font-medium">Enviado:</div>
            <div className="mt-1">Nombre: {submitted.name}</div>
            <div>Email: {submitted.email}</div>
          </div>
        )}
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}












