import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ContactForm from "@/components/contact-form";
import DemoTable from "@/components/demo-table";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--prophero-gray-50)] font-sans dark:bg-[var(--prophero-gray-950)]">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-card dark:bg-[var(--prophero-gray-950)] sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground dark:text-[var(--prophero-gray-50)]">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-[var(--prophero-gray-600)] dark:text-[var(--prophero-gray-400)]">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-[var(--prophero-gray-950)] dark:text-[var(--prophero-gray-50)]"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-[var(--prophero-gray-950)] dark:text-[var(--prophero-gray-50)]"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
        <div className="mt-12 w-full">
          <Card>
            <CardHeader>
              <CardTitle>shadcn/ui demo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input placeholder="Type something..." />
              <div className="flex gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline">Submit</Button>
            </CardFooter>
          </Card>
        </div>
        <div className="mt-12 w-full">
          <ContactForm />
        </div>
        <div className="mt-12 w-full">
          <DemoTable />
        </div>
      </main>
    </div>
  );
}
