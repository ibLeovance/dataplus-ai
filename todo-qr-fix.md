# TODO — Jagora + QR Verification

- [x] Fix guide section 7b: rate limit is 10/15min (not 5)
- [x] Fix guide section 9: PR #47183 still open
- [x] Fix guide section 10: latest commit is f068a78
- [x] Verify live site QR codes match real wallet addresses (scan decode check)
- [x] Fix QR if mismatched — NOT NEEDED: QR data matches DB (trx=btc=usdt all exact)
- [x] Test rate limit on live site — register + withdrawal endpoints both return 429 (sandbox IP already quota-exhausted from Round 8 test, confirming limit works)
- [x] Update guide with QR verification result and rate-limit test steps
