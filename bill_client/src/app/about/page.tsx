"use client";
import Navigation from "@/components/navigation";
import Image from "next/image";

export default function About() {
    return (
        <>       
        <Navigation />
            <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-black text-white">
                <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
                    <h1 className="text-4xl font-bold text-center sm:text-left text-white">
                        <div className="p-8">
                            <h1 className="text-3xl font-bold mb-4 text-white">Description of the project here.</h1>
                            <p className="text-gray-300">Add your project description content here.</p>
                        </div>
                    </h1>
                </main>
                <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-white hover:text-gray-300"
                        href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image
                            aria-hidden
                            src="/file.svg"
                            alt="File icon"
                            width={16}
                            height={16}
                            style={{ filter: 'invert(1)' }}
                        />
                        Learn
                    </a>
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-white hover:text-gray-300"
                        href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image
                            aria-hidden
                            src="/globe.svg"
                            alt="Globe icon"
                            width={16}
                            height={16}
                            style={{ filter: 'invert(1)' }}
                        />
                        Go to nextjs.org →
                    </a>
                </footer>
            </div>
        </>
    );
}
