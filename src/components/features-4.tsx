import { ChartLine, Lightbulb, Rocket, Search } from 'lucide-react'

export default function Features() {
    return (
        <section className="py-12 md:py-32 bg-gray-50" id="tool">
            <div className="mx-auto max-w-5xl space-y-8 px-4 md:space-y-16">
                <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
                    <h2 className="text-balance text-4xl font-medium lg:text-5xl">Why This Tool Gives You a Competitive Edge</h2>
                    <p>Your audience is talking - <b>but not just on your channel.</b> They&apos;re leaving valuable insights <b>on your competitors&apos; videos, in trending content, and across YouTube.</b></p>
                </div>

                <div className="relative mx-auto grid max-w-4xl rounded-lg divide-x divide-y border *:p-5 md:*:p-12 sm:grid-cols-2 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Search className="size-10" />
                            <div className="space-y-2">
                                <h3 className="text-md font-medium">Want to know what frustrates your competitor’s audience?</h3>
                                <p className="text-sm">Use AI to identify common pain points and create content that solves them.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Lightbulb className="size-10" />
                            <div className="space-y-2">
                                <h3 className="text-md font-medium">Struggling with video ideas?</h3>
                                <p className="text-sm">See what people are asking for in the comments and deliver content they&apos;re dying to watch.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <ChartLine className="size-10" />
                            <div className="space-y-2">
                                <h3 className="text-md font-medium">Want to grow faster?</h3>
                                <p className="text-sm">Cover high-demand topics and attract new viewers from your competitor&apos;s audience.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Rocket className="size-10" />
                            <h3 className="text-md font-medium">This is the smartest way to create content that gets more views, engagement, and subscribers!</h3>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
