import { Video } from 'lucide-react'
import Image from 'next/image'

export default function ContentSection() {
    return (
        <section className="py-12 md:py-32 bg-gray-50" id='solution'>
            <div className="mx-auto container space-y-8 px-4 md:space-y-16">
                <h2 className="relative z-10 max-w-xl text-4xl font-medium lg:text-5xl">Stop wasting time. Let AI do the work!</h2>
                <div className="grid gap-6 place-items-center sm:grid-cols-2 md:gap-12 lg:gap-24">
                    <div className="relative mb-6 sm:mb-0">
                        <div className="bg-linear-to-b relative rounded-2xl from-zinc-300 to-transparent p-px">
                            <Image src="/content.webp" className="rounded-[15px] shadow" alt="payments illustration light" width={1207} height={929} />
                        </div>
                    </div>

                    <div className="relative space-y-4">
                        <h3 className="text-muted-foreground text-[24px]">
                            <span className="text-accent-foreground font-bold">How It Works</span>
                        </h3>
                        <p className="text-muted-foreground">Using AI-powered comment analysis is as easy as 1-2-3:</p>

                        <div className="grid pt-6 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        1
                                    </div>
                                    <h3 className="text-sm font-medium">Paste ANY YouTube Video Link</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Analyze comments from your own videos, competitors’ content, or trending creators.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        2
                                    </div>
                                    <h3 className="text-sm font-medium"> AI Scans & Extracts Key Insights</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Instantly identify pain points, trending topics, and audience sentiment.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 rounded-full bg-black text-white font-bold shadow-lg">
                                        3
                                    </div>
                                    <h3 className="text-sm font-medium">Get Actionable Data to Grow Faster</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">Use the insights to improve your content strategy, generate viral video ideas, and connect with a wider audience.</p>
                            </div>
                        </div>
                        <p className="flex gap-2 items-center text-muted-foreground"> <Video size={18} /> Create content people are actually searching for—and grow your channel with ease!
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
