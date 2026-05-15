import { Lightbulb } from 'lucide-react'
import Image from 'next/image'

export default function ContentSectionReverse() {
    return (
        <section className="py-12 md:py-32 bg-gray-50" id='about'>
            <div className="mx-auto container space-y-4 px-4 md:space-y-16">
                <h2 className="relative z-10 max-w-xl text-4xl font-medium lg:text-5xl">Who Is This For?</h2>
                <div className="grid gap-6 place-items-center sm:grid-cols-2 md:gap-12 lg:gap-24">
                    <div className="relative space-y-4">
                        {/* <p className="text-muted-foreground">
                            Gemini is evolving to be more than just the models. <span className="text-accent-foreground font-bold">It supports an entire ecosystem</span> — from products innovate.
                        </p>
                        <p className="text-muted-foreground">It supports an entire ecosystem — from products to the APIs and platforms helping developers and businesses innovate</p> */}

                        <div className="grid pt-6 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        1
                                    </div>
                                    <h3 className="text-sm font-medium">YouTubers & Content Creators</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Find new content ideas and expand your audience.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        2
                                    </div>
                                    <h3 className="text-sm font-medium">Brands & Businesses</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Discover customer pain points and improve messaging.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        3
                                    </div>
                                    <h3 className="text-sm font-medium">Marketing Agencies</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Gain competitive insights and optimize campaigns.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        4
                                    </div>
                                    <h3 className="text-sm font-medium">Community Managers</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Engage more effectively with your audience.</p>
                            </div>
                        </div>
                        <p className="flex gap-2 items-center text-muted-foreground"> <Lightbulb /> If comments matter to you, this tool is your new secret weapon!</p>
                    </div>
                    <div className="relative mt-6 sm:mt-0">
                        <div className="bg-linear-to-b aspect-67/34 relative rounded-2xl from-zinc-300 to-transparent p-px">
                            <Image src="/content.webp" className="rounded-[15px] shadow" alt="payments illustration light" width={1206} height={612} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
