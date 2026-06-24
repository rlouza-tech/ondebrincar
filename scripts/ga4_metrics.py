#!/usr/bin/env python3
"""
Puxa métricas do GA4 para o Onde Brincar via Google Analytics Data API.
Uso: python scripts/ga4_metrics.py [--start YYYY-MM-DD] [--end YYYY-MM-DD]

Credenciais: ~/.config/onde-brincar/ga4-credentials.json
Property ID: 538618187
"""

import os
import sys
import json
import argparse
from datetime import date

CREDENTIALS_PATH = os.path.expanduser("~/.config/onde-brincar/ga4-credentials.json")
PROPERTY_ID = "538618187"
# Data de lançamento do site
LAUNCH_DATE = "2025-01-01"  # ajustar se necessário


def get_client():
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    return BetaAnalyticsDataClient(credentials=creds)


def run_report(client, start_date, end_date, dimensions, metrics):
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    request = RunReportRequest(
        property=f"properties/{PROPERTY_ID}",
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    return client.run_report(request)


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def format_number(val):
    try:
        n = float(val)
        if n >= 1_000_000:
            return f"{n/1_000_000:.1f}M"
        if n >= 1_000:
            return f"{n/1_000:.1f}k"
        return f"{int(n):,}"
    except ValueError:
        return val


def main():
    parser = argparse.ArgumentParser(description="GA4 Metrics — Onde Brincar")
    parser.add_argument("--start", default=LAUNCH_DATE, help="Data inicial (YYYY-MM-DD)")
    parser.add_argument("--end", default=str(date.today()), help="Data final (YYYY-MM-DD)")
    args = parser.parse_args()

    start, end = args.start, args.end
    print(f"\nPeríodo: {start} → {end}")
    print(f"Property: {PROPERTY_ID}")

    client = get_client()

    # ── 1. Visão geral ────────────────────────────────────────────────────────
    print_section("Visão Geral")
    resp = run_report(
        client, start, end,
        dimensions=[],
        metrics=["sessions", "activeUsers", "newUsers", "screenPageViews",
                 "bounceRate", "averageSessionDuration", "engagedSessions"],
    )
    row = resp.rows[0].metric_values if resp.rows else []
    labels = ["Sessões", "Usuários Ativos", "Novos Usuários", "Pageviews",
              "Taxa de Rejeição", "Duração Média (s)", "Sessões Engajadas"]
    for label, cell in zip(labels, row):
        val = cell.value
        if label == "Taxa de Rejeição":
            val = f"{float(val)*100:.1f}%"
        elif label == "Duração Média (s)":
            secs = int(float(val))
            val = f"{secs//60}m {secs%60}s"
        else:
            val = format_number(val)
        print(f"  {label:<28} {val}")

    # ── 2. Top páginas ────────────────────────────────────────────────────────
    print_section("Top 10 Páginas")
    resp = run_report(
        client, start, end,
        dimensions=["pageTitle"],
        metrics=["screenPageViews", "activeUsers"],
    )
    rows = sorted(resp.rows, key=lambda r: int(r.metric_values[0].value), reverse=True)[:10]
    print(f"  {'Página':<45} {'Views':>8} {'Usuários':>10}")
    print(f"  {'-'*45} {'-'*8} {'-'*10}")
    for r in rows:
        title = r.dimension_values[0].value[:44]
        views = format_number(r.metric_values[0].value)
        users = format_number(r.metric_values[1].value)
        print(f"  {title:<45} {views:>8} {users:>10}")

    # ── 3. Canal de aquisição ─────────────────────────────────────────────────
    print_section("Aquisição por Canal")
    resp = run_report(
        client, start, end,
        dimensions=["sessionDefaultChannelGroup"],
        metrics=["sessions", "newUsers"],
    )
    rows = sorted(resp.rows, key=lambda r: int(r.metric_values[0].value), reverse=True)
    print(f"  {'Canal':<30} {'Sessões':>10} {'Novos Usuários':>16}")
    print(f"  {'-'*30} {'-'*10} {'-'*16}")
    for r in rows:
        canal = r.dimension_values[0].value
        sess = format_number(r.metric_values[0].value)
        news = format_number(r.metric_values[1].value)
        print(f"  {canal:<30} {sess:>10} {news:>16}")

    # ── 4. Dispositivos ───────────────────────────────────────────────────────
    print_section("Dispositivos")
    resp = run_report(
        client, start, end,
        dimensions=["deviceCategory"],
        metrics=["sessions", "activeUsers"],
    )
    rows = sorted(resp.rows, key=lambda r: int(r.metric_values[0].value), reverse=True)
    for r in rows:
        cat = r.dimension_values[0].value
        sess = format_number(r.metric_values[0].value)
        users = format_number(r.metric_values[1].value)
        print(f"  {cat:<20} Sessões: {sess:>8}   Usuários: {users:>8}")

    # ── 5. Evolução mensal ────────────────────────────────────────────────────
    print_section("Evolução Mensal (Sessões & Usuários)")
    resp = run_report(
        client, start, end,
        dimensions=["yearMonth"],
        metrics=["sessions", "activeUsers"],
    )
    rows = sorted(resp.rows, key=lambda r: r.dimension_values[0].value)
    print(f"  {'Mês':<10} {'Sessões':>10} {'Usuários':>10}")
    print(f"  {'-'*10} {'-'*10} {'-'*10}")
    for r in rows:
        ym = r.dimension_values[0].value
        mes = f"{ym[:4]}-{ym[4:]}"
        sess = format_number(r.metric_values[0].value)
        users = format_number(r.metric_values[1].value)
        print(f"  {mes:<10} {sess:>10} {users:>10}")

    # ── 6. Top cidades ────────────────────────────────────────────────────────
    print_section("Top 10 Cidades")
    resp = run_report(
        client, start, end,
        dimensions=["city"],
        metrics=["activeUsers"],
    )
    rows = sorted(resp.rows, key=lambda r: int(r.metric_values[0].value), reverse=True)[:10]
    for i, r in enumerate(rows, 1):
        city = r.dimension_values[0].value
        users = format_number(r.metric_values[0].value)
        print(f"  {i:>2}. {city:<30} {users:>8} usuários")

    print("\n")


if __name__ == "__main__":
    main()
