'use client'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const menuItems = [
    { name: 'Features', href: '/#features' },
    { name: 'Solution', href: '/#solution' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'About', href: '/#about' },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const { currentUser, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
          await logout();
          toast.success("Logged out successfully");
          router.push("/login");
        } catch {
          toast.error("Failed to log out");
        }
      };
      

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="bg-background/50 fixed z-20 w-full border-b backdrop-blur-3xl">
                <div className="mx-auto container px-4 transition-all duration-300">
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex items-center justify-between gap-12 lg:w-auto">
                            <Link href="/" aria-label="home" className="flex items-center space-x-2">
                                <Image src="/Wireframe.png" alt="Logo" width={140} height={50} />
                            </Link>
                        </div>

                        <div className="header_menu">
                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>

                            <div className="hidden lg:block">
                                <ul className="flex gap-8 text-sm">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-4 md:p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                {currentUser ? (
                                    <div className="flex flex-wrap md:gap-4 gap-3">
                                        <Link href="/dashboard">
                                            <Button variant="ghost">Dashboard</Button>
                                        </Link>
                                        <Link href="/profile">
                                            <Button variant="outline">Profile</Button>
                                        </Link>
                                        <Button variant="destructive" onClick={handleLogout}>
                                            Log out
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <Link href="/login">
                                            <Button variant="outline">Log in</Button>
                                        </Link>
                                        <Link href="/signup">
                                            <Button>Sign up</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}
