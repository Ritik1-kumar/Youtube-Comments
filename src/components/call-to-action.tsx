import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CallToAction() {
    return (
        <section className="py-12 md:py-32">
            <div className="mx-auto max-w-5xl px-4">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl">Ready to Find Your Next Viral Idea?</h2>
                    <p className="mt-6">Analyze your audience, spy on competitors, and create smarter content today!</p>

                    <div className="mt-6 md:mt-12 flex flex-wrap justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href="/youtube-analyzer">
                                <span>Start Analyzing Now</span>
                            </Link>
                        </Button>

                        {/* <Button asChild size="lg" variant="outline">
                            <Link href="/">
                                <span>Book Demo</span>
                            </Link>
                        </Button> */}
                    </div>
                </div>
            </div>
        </section>
    )
}
