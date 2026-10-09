"""Pure monthly accounting. No network, file access, or implicit parameters."""

from datetime import date

from .contracts import Country, CountryResult, Point, Scenario


def simulate(scenario: Scenario, countries: list[Country]) -> list[CountryResult]:
    results = []
    for country in countries:
        baseline = country.baseline
        points = []
        for month in range(scenario.horizon_months + 1):
            years = month / 12
            progress = min(1.0, max(0.0, (month - scenario.transition_onset_month)
                                  / scenario.transition_duration_months))
            gdp = 100 * (1 + scenario.real_gdp_growth) ** years
            prices = 100 * (1 + scenario.annual_inflation) ** years
            bitcoin = 100 * (1 + scenario.bitcoin_real_growth) ** years
            assets = 100 * (1 - scenario.asset_decline * progress)
            fiscal = {key: None for key in (
                "compulsory_revenue", "other_revenue", "sustainable_spending",
                "planned_spending", "financing", "funded_spending", "funding_gap",
                "funding_gap_pct_gdp",
            )}
            if baseline is not None:
                collection = 1 - progress * (1 - scenario.collection_effectiveness)
                compulsory = baseline.compulsory_revenue_pct_gdp * gdp / 100 * collection
                other = baseline.other_revenue_pct_gdp * (1 + scenario.other_revenue_growth) ** years
                spending = baseline.expenditure_pct_gdp * (1 + scenario.real_spending_growth) ** years
                revenue = compulsory + other
                # Financing coverage falls to zero; it is not a debt-stock model.
                financing = max(0.0, spending - revenue) * (1 - progress)
                gap = max(0.0, spending - revenue - financing)
                fiscal = dict(compulsory_revenue=compulsory, other_revenue=other,
                              sustainable_spending=revenue, planned_spending=spending,
                              financing=financing, funded_spending=min(spending, revenue + financing),
                              funding_gap=gap, funding_gap_pct_gdp=gap / gdp * 100)
            absolute_month = scenario.forecast_origin.year * 12 + scenario.forecast_origin.month - 1 + month
            points.append(Point(
                month=month, date=date(absolute_month // 12, absolute_month % 12 + 1, 1),
                transition=progress, gdp_index=gdp, productive_capacity_index=100,
                price_index=prices, bitcoin_real_index=bitcoin,
                bitcoin_dollar_index=bitcoin * prices / 100,
                bitcoin_bitcoin_index=100,
                stock_real_index=assets, property_real_index=assets,
                stock_dollar_index=assets * prices / 100,
                property_dollar_index=assets * prices / 100,
                stock_bitcoin_index=assets * 100 / bitcoin,
                property_bitcoin_index=assets * 100 / bitcoin,
                **fiscal,
                refinancing_requirement=None,
            ))
        results.append(CountryResult(country_id=country.id, baseline=baseline, points=points,
                                     research_gaps=country.research_gaps))
    return results
