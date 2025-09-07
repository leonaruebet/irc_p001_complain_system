# Complaint Flow Diagram

```mermaid
flowchart LR
    subgraph U[Employee]
        U1[/complain Command/]
        U2[Send Complaint Messages]
        U3[/submit Command/]
    end

    subgraph L[LINE OA Bot]
        L1[Start Session & Guide User]
        L2[Capture Messages]
        L3[Confirm Submission]
    end

    subgraph C[Complaint System]
        C1[Create Session in DB]
        C2[Store Chat Logs]
        C3[Mark Session as Submitted]
        C4[Generate Complaint ID]
        C5[Push Data to HR Dashboard]
    end

    subgraph H[HR Dashboard]
        H1[View Complaints List]
        H2[Review Conversation Logs]
        H3[Update Status & Add Notes]
        H4[Generate Reports]
    end

    %% Flow
    U1 --> L1 --> C1
    U2 --> L2 --> C2
    U3 --> L3 --> C3 --> C4 --> C5 --> H1
    H1 --> H2 --> H3 --> C5
    H4 <--> C5
