import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Check } from 'lucide-react'

export default function HeroSection() {
    return (
        <>
            <main className="overflow-x-hidden" id='banner'>
                <section>
                    <div className="pb-12 pt-25 md:pb-32 lg:pb-46 lg:pt-44">
                        <div className="relative mx-auto flex container flex-col px-4 lg:block">
                            <div className="mx-auto max-w-xl text-center lg:ml-0 lg:w-1/2 lg:text-left">
                                <h1 className="mt-8 max-w-2xl text-balance text-5xl font-medium md:text-6xl lg:mt-16 xl:text-7xl"> Your Secret Weapon for YouTube Growth</h1>
                                <p className="mt-8 max-w-2xl text-pretty text-lg">
                                    Uncover Hidden Insights in ANY YouTube Video’s Comments.
                                    <br></br>
                                    Want to know exactly what your audience - and your competitors’ audiences - are thinking?
                                </p>
                                <p className="mt-8 max-w-2xl text-pretty text-lg">
                                    Our <b>AI-powered comment analysis</b> helps you:
                                </p>
                                <ul className="mt-8 *:flex *:items-start *:gap-3 *:py-3">
                                    <li className="flex items-start">
                                        <Check className="size-6" />
                                        <p><b>Analyze your own video comments</b> for audience feedback & trends.</p>
                                    </li>
                                    <li>
                                        <Check className="size-6" />
                                        <p><b>Spy on competitors’ comments</b> to see what’s working (or failing) for them.</p>
                                    </li>
                                    <li>
                                        <Check className="size-6" />
                                        <p><b>Uncover audience pain points</b> and give them exactly what they want.</p>
                                    </li>
                                    <li>
                                        <Check className="size-6" />
                                        <p><b>Find untapped content ideas</b> that could skyrocket your engagement.</p>
                                    </li>
                                    <li>
                                        <Check className="size-6" />
                                        <p><b>Expand your reach</b> by covering topics your audience craves.</p>
                                    </li>
                                    <li>
                                        <Check className="size-6" />
                                        <p><b>Stop guessing. Start creating videos that get results! </b></p>
                                    </li>
                                </ul>
                                <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="px-5 text-base">
                                        <Link href="/pricing">
                                            <span className="text-nowrap">Get Started Now</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <Image
                                className="-z-10 order-first ml-auto h-56 w-full object-cover invert sm:h-96 lg:absolute lg:inset-0 lg:-right-20 lg:-top-96 lg:order-last lg:h-max lg:w-2/3 lg:object-contain"
                                src="/hero.jpg"
                                alt="Abstract Object"
                                height="4000"
                                width="3000"
                            />
                        </div>
                    </div>
                </section>

            </main>
        </>
    )
}
