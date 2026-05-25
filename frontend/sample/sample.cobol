      * Sample COBOL Program
      * Demonstrates basic COBOL structure and operations
      
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SAMPLE-PROGRAM.
       AUTHOR. SAMPLE.
       
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
       
       DATA DIVISION.
       FILE SECTION.
       
       WORKING-STORAGE SECTION.
       01 WS-VARIABLES.
           05 WS-COUNTER          PIC 9(4) VALUE 0.
           05 WS-NAME             PIC X(30).
           05 WS-AGE              PIC 9(3) VALUE 0.
           05 WS-SALARY           PIC 9(8)V99 VALUE 0.00.
           05 WS-RESULT           PIC 9(8)V99 VALUE 0.00.
       
       01 WS-EMPLOYEE-RECORD.
           05 EMP-ID              PIC 9(5).
           05 EMP-NAME            PIC X(30).
           05 EMP-DEPARTMENT      PIC X(20).
           05 EMP-SALARY          PIC 9(8)V99.
       
       PROCEDURE DIVISION.
           PERFORM MAIN-PROCEDURE.
           STOP RUN.
       
       MAIN-PROCEDURE.
           DISPLAY "Welcome to COBOL Sample Program".
           MOVE 25 TO WS-AGE.
           MOVE "John Doe" TO WS-NAME.
           MOVE 50000.00 TO WS-SALARY.
           
           PERFORM CALCULATE-BONUS.
           
           DISPLAY "Employee: " WS-NAME.
           DISPLAY "Age: " WS-AGE.
           DISPLAY "Salary: " WS-SALARY.
           DISPLAY "Bonus: " WS-RESULT.
       
       CALCULATE-BONUS.
           IF WS-AGE >= 18
               MULTIPLY WS-SALARY BY 0.10 GIVING WS-RESULT
               DISPLAY "Employee is eligible for bonus"
           ELSE
               MOVE 0 TO WS-RESULT
               DISPLAY "Employee is not eligible"
           END-IF.
