
const tableData = [
    {
        feature: 'Time Spent',
        manual: 'Hours per video',
        ai: 'Seconds per video',
    },
    {
        feature: 'Insights Found',
        manual: 'Limited',
        ai: 'Deep, data-driven insights',
    },
    {
        feature: 'Trend Detection',
        manual: 'Hard to spot',
        ai: 'instant recognition',
    },
    {
        feature: 'Audience Sentiment',
        manual: 'Guesswork',
        ai: 'AI-powered accuracy',
    },
    {
        feature: 'Engagement Optimization',
        manual: 'Trial & error',
        ai: 'Data-backed decisions',
    }
]

export default function PricingComparator() {
    return (
        <section className="py-12 md:py-32" id='features'>
            <div className="mx-auto container px-4">
                <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12 mb-14 md:mb-20">
                    <h2 className="text-balance text-4xl font-medium lg:text-5xl">AI vs. Manual Analysis – See the Difference</h2>
                </div>
                <div className="w-full overflow-auto lg:overflow-visible">
                    <table className="w-[200vw] border-separate border-spacing-x-3 md:w-full">
                        <thead className="bg-background sticky top-0">
                            <tr className="*:py-4 *:text-left *:font-medium *:text-lg">
                                <th className="lg:w-2/5">Features</th>
                                <th className="space-y-3">
                                    <span className="block">Manual Analysis</span>
                                </th>
                                <th className="bg-muted rounded-t-(--radius) space-y-3 px-4">
                                    <span className="block">AI Analysis</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-caption text-sm">
                            {/* <tr className="*:py-3">
                                  <td className="flex items-center gap-2 font-medium">
                                      <span>Features</span>
                                  </td>
                                  <td></td>
                                  <td className="bg-muted border-none px-4"></td>
                                  <td></td>
                              </tr> */}
                            {tableData.map((row, index) => (
                                <tr key={index} className="*:border-b *:py-3">
                                    <td className="text-muted-foreground">{row.feature}</td>
                                    <td>
                                        {row.manual}
                                    </td>
                                    <td className="bg-muted px-4">
                                        {row.ai}
                                    </td>
                                </tr>
                            ))}
                            <tr className="*:py-4">
                                <td></td>
                                <td></td>
                                <td className="bg-muted rounded-b-(--radius) border-none px-4"></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
